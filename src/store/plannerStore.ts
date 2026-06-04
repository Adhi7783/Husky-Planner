import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, isValid } from 'date-fns';
import type { PlannerState, NewAssignment, AssignmentPayload } from '../types';
import { storageService } from '../services/storageService';
import { groqService, GroqServiceError } from '../services/groqService';

// ---------------------------------------------------------------------------
// PlannerActions interface
// ---------------------------------------------------------------------------

interface PlannerActions {
  addClass(name: string, difficulty?: number): void;
  deleteClass(classId: string): void;
  addAssignment(classId: string, assignment: NewAssignment): void;
  deleteAssignment(classId: string, assignmentId: string): void;
  toggleAssignmentComplete(classId: string, assignmentId: string): void;
  selectClass(classId: string | null): void;
  requestPrioritySort(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: PlannerState = {
  classes: [],
  assignments: [],
  selectedClassId: null,
  priorityList: [],
  sortState: 'idle',
  sortError: null,
  persistenceError: null,
  activeUserId: '',
};

// ---------------------------------------------------------------------------
// Debounce helper
// ---------------------------------------------------------------------------

let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(state: PlannerState): void {
  if (!state.activeUserId) return;

  if (saveTimeoutId !== null) {
    clearTimeout(saveTimeoutId);
  }
  saveTimeoutId = setTimeout(() => {
    saveTimeoutId = null;
    const result = storageService.save(state, state.activeUserId);
    if (result instanceof Error) {
      usePlannerStore.setState({
        persistenceError: 'Changes could not be saved. Storage may be full.',
      });
    }
  }, 500);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlannerStore = create<PlannerState & PlannerActions>((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // addClass — now accepts optional difficulty (1–5, default 3)
  // -------------------------------------------------------------------------
  addClass(name: string, difficulty = 3): void {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;

    const { classes } = get();
    const lowerTrimmed = trimmed.toLowerCase();
    const isDuplicate = classes.some((cls) => cls.name.toLowerCase() === lowerTrimmed);
    if (isDuplicate) return;

    const newClass = {
      id: uuidv4(),
      name: trimmed,
      createdAt: Date.now(),
      difficulty: Math.min(5, Math.max(1, Math.round(difficulty))),
    };

    set((state) => ({ classes: [...state.classes, newClass] }));
    scheduleSave({ ...get() });
  },

  // -------------------------------------------------------------------------
  // deleteClass
  // -------------------------------------------------------------------------
  deleteClass(classId: string): void {
    set((state) => ({
      classes: state.classes.filter((cls) => cls.id !== classId),
      assignments: state.assignments.filter((a) => a.classId !== classId),
      selectedClassId: state.selectedClassId === classId ? null : state.selectedClassId,
    }));
    scheduleSave({ ...get() });
  },

  // -------------------------------------------------------------------------
  // selectClass
  // -------------------------------------------------------------------------
  selectClass(classId: string | null): void {
    set({ selectedClassId: classId });
  },

  // -------------------------------------------------------------------------
  // addAssignment — now accepts weight and difficulty
  // -------------------------------------------------------------------------
  addAssignment(classId: string, assignment: NewAssignment): void {
    const trimmedName = assignment.name.trim();
    if (trimmedName.length === 0) return;
    if (!assignment.dueDate || !isValid(parseISO(assignment.dueDate))) return;

    const newAssignment = {
      id: uuidv4(),
      classId,
      name: trimmedName,
      dueDate: assignment.dueDate,
      description: assignment.description,
      weight: assignment.weight,
      difficulty: assignment.difficulty,
      completed: false,
      createdAt: Date.now(),
    };

    set((state) => ({ assignments: [...state.assignments, newAssignment] }));
    scheduleSave({ ...get() });
  },

  // -------------------------------------------------------------------------
  // deleteAssignment
  // -------------------------------------------------------------------------
  deleteAssignment(_classId: string, assignmentId: string): void {
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== assignmentId),
      priorityList: state.priorityList.filter((item) => item.assignmentId !== assignmentId),
    }));
    scheduleSave({ ...get() });
  },

  // -------------------------------------------------------------------------
  // toggleAssignmentComplete
  // -------------------------------------------------------------------------
  toggleAssignmentComplete(_classId: string, assignmentId: string): void {
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === assignmentId ? { ...a, completed: !a.completed } : a
      ),
    }));
    scheduleSave({ ...get() });
  },

  // -------------------------------------------------------------------------
  // requestPrioritySort — enriched payload with difficulty/weight/classDifficulty
  // -------------------------------------------------------------------------
  async requestPrioritySort(): Promise<void> {
    const { assignments, classes, sortState: currentSortState } = get();

    if (currentSortState === 'loading') {
      if (import.meta.env.DEV) {
        console.warn('[STORE] Request already in flight, ignoring duplicate call');
      }
      return;
    }

    const incompleteAssignments = assignments.filter((a) => !a.completed);

    if (incompleteAssignments.length === 0) {
      set({ sortError: 'No incomplete assignments to prioritize.' });
      return;
    }

    set({ sortState: 'loading', sortError: null });

    // Build enriched payload — include difficulty, weight, and class difficulty
    const payload: AssignmentPayload[] = incompleteAssignments.map((a) => {
      const parentClass = classes.find((cls) => cls.id === a.classId);
      const entry: AssignmentPayload = {
        id: a.id,
        name: a.name,
        dueDate: a.dueDate,
        className: parentClass?.name ?? '',
      };
      if (a.description !== undefined) entry.description = a.description;
      if (a.weight !== undefined) entry.weight = a.weight;
      if (a.difficulty !== undefined) entry.difficulty = a.difficulty;
      if (parentClass?.difficulty !== undefined) entry.classDifficulty = parentClass.difficulty;
      return entry;
    });

    try {
      const results = await groqService.prioritize(payload);

      const currentAssignments = get().assignments;
      const assignmentsById = new Map(currentAssignments.map((a) => [a.id, a]));
      const reorderedAssignments = [] as typeof currentAssignments;

      for (const result of results) {
        const assignment = assignmentsById.get(result.assignmentId);
        if (!assignment) {
          if (import.meta.env.DEV) {
            console.warn(`[STORE] Unknown assignmentId ${result.assignmentId} from Groq, skipping.`);
          }
          continue;
        }
        reorderedAssignments.push({ ...assignment, explanation: result.explanation });
        assignmentsById.delete(result.assignmentId);
      }

      const remainingAssignments = currentAssignments.filter((a) => assignmentsById.has(a.id));
      const updatedAssignments = [...reorderedAssignments, ...remainingAssignments];

      const priorityList = results.map((result, index) => ({
        assignmentId: result.assignmentId,
        rank: index + 1,
        explanation: result.explanation,
      }));

      set({ assignments: updatedAssignments, priorityList, sortState: 'idle', sortError: null });
      scheduleSave({ ...get() });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[STORE] Error during prioritization:', err);
      }

      let errorMessage: string;
      if (err instanceof GroqServiceError) {
        switch (err.kind) {
          case 'http': errorMessage = err.message; break;
          case 'timeout': errorMessage = 'Request timed out. Please try again.'; break;
          case 'parse': errorMessage = 'Could not parse the AI response. Please try again.'; break;
          default: errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }

      set({ priorityList: [], sortState: 'error', sortError: errorMessage });
      scheduleSave({ ...get() });
    }
  },
}));

// ---------------------------------------------------------------------------
// Store hydration from localStorage
// ---------------------------------------------------------------------------

export function hydratePlannerStore(userId: string): void {
  const rawKey = `huskyPlanner_v1:${userId}`;
  const rawExists = localStorage.getItem(rawKey) !== null;
  const loaded = storageService.load(userId);

  if (loaded !== null) {
    usePlannerStore.setState({
      classes: loaded.classes,
      assignments: loaded.assignments,
      selectedClassId: loaded.selectedClassId,
      activeUserId: userId,
    });
  } else if (rawExists) {
    usePlannerStore.setState({
      activeUserId: userId,
      persistenceError: 'Some previously saved data could not be loaded and has been discarded.',
    });
  } else {
    usePlannerStore.setState({ activeUserId: userId });
  }
}

export default usePlannerStore;
