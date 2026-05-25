import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, isValid } from 'date-fns';
import type { PlannerState, NewAssignment, AssignmentPayload } from '../types';
import { storageService } from '../services/storageService';
import { geminiService, GeminiServiceError } from '../services/geminiService';

// ---------------------------------------------------------------------------
// PlannerActions interface
// ---------------------------------------------------------------------------

interface PlannerActions {
  addClass(name: string): void;
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
};

// ---------------------------------------------------------------------------
// Debounce helper
// ---------------------------------------------------------------------------

let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(state: PlannerState): void {
  if (saveTimeoutId !== null) {
    clearTimeout(saveTimeoutId);
  }
  saveTimeoutId = setTimeout(() => {
    saveTimeoutId = null;
    const result = storageService.save(state);
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
  // addClass
  // -------------------------------------------------------------------------
  addClass(name: string): void {
    const trimmed = name.trim();

    // Reject empty / whitespace-only names
    if (trimmed.length === 0) return;

    const { classes } = get();

    // Reject case-insensitive duplicates
    const lowerTrimmed = trimmed.toLowerCase();
    const isDuplicate = classes.some(
      (cls) => cls.name.toLowerCase() === lowerTrimmed
    );
    if (isDuplicate) return;

    const newClass = {
      id: uuidv4(),
      name: trimmed,
      createdAt: Date.now(),
    };

    set((state) => ({ classes: [...state.classes, newClass] }));

    // Schedule debounced save with the updated state
    scheduleSave({ ...get() });
  },

  // -------------------------------------------------------------------------
  // deleteClass
  // -------------------------------------------------------------------------
  deleteClass(classId: string): void {
    // Atomically remove the class and all its assignments in one setState call
    set((state) => ({
      classes: state.classes.filter((cls) => cls.id !== classId),
      assignments: state.assignments.filter((a) => a.classId !== classId),
      // Clear selectedClassId if the deleted class was selected
      selectedClassId:
        state.selectedClassId === classId ? null : state.selectedClassId,
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
  // addAssignment
  // -------------------------------------------------------------------------
  addAssignment(classId: string, assignment: NewAssignment): void {
    const trimmedName = assignment.name.trim();

    // Validate non-empty name
    if (trimmedName.length === 0) return;

    // Validate ISO 8601 due date
    if (!assignment.dueDate || !isValid(parseISO(assignment.dueDate))) return;

    const newAssignment = {
      id: uuidv4(),
      classId,
      name: trimmedName,
      dueDate: assignment.dueDate,
      description: assignment.description,
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
      priorityList: state.priorityList.filter(
        (item) => item.assignmentId !== assignmentId
      ),
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

  async requestPrioritySort(): Promise<void> {
    console.log(`[STORE] requestPrioritySort() called`);
    
    const { assignments, classes, sortState: currentSortState } = get();
    
    console.log(`[STORE] Current sortState: ${currentSortState}`);

    // Guard: prevent duplicate requests while one is already in flight
    if (currentSortState === 'loading') {
      console.warn(`[STORE] Request already in flight (sortState=loading), ignoring duplicate call`);
      return;
    }

    // Guard: if no incomplete assignments exist, set informational message and return
    const incompleteAssignments = assignments.filter((a) => !a.completed);
    console.log(`[STORE] Found ${incompleteAssignments.length} incomplete assignments`);
    
    if (incompleteAssignments.length === 0) {
      console.log(`[STORE] No incomplete assignments, setting error state`);
      set({ sortError: 'No incomplete assignments to prioritize.' });
      return;
    }

    // Set loading state to disable sort button in UI
    console.log(`[STORE] Setting sortState to 'loading', making API request...`);
    set({ sortState: 'loading', sortError: null });

    // Collect all incomplete assignments as AssignmentPayload[]
    const payload: AssignmentPayload[] = incompleteAssignments.map((a) => {
      const parentClass = classes.find((cls) => cls.id === a.classId);
      const entry: AssignmentPayload = {
        id: a.id,
        name: a.name,
        dueDate: a.dueDate,
        className: parentClass?.name ?? '',
      };
      if (a.description !== undefined) {
        entry.description = a.description;
      }
      return entry;
    });

    try {
      console.log(`[STORE] Calling geminiService.prioritize() with ${payload.length} assignments`);
      const results = await geminiService.prioritize(payload);
      console.log(`[STORE] Gemini returned ${results.length} prioritized results`);

      const currentAssignments = get().assignments;
      const assignmentsById = new Map(currentAssignments.map((assignment) => [assignment.id, assignment]));
      const reorderedAssignments = [] as typeof currentAssignments;

      for (const result of results) {
        const assignment = assignmentsById.get(result.assignmentId);
        if (!assignment) {
          console.warn(
            `[STORE] Gemini result contains unknown assignmentId ${result.assignmentId}, skipping.`
          );
          continue;
        }
        reorderedAssignments.push({
          ...assignment,
          explanation: result.explanation,
        });
        assignmentsById.delete(result.assignmentId);
      }

      // Preserve assignments not included in the priority response, keeping their original relative order.
      const remainingAssignments = currentAssignments.filter((assignment) =>
        assignmentsById.has(assignment.id)
      );

      const updatedAssignments = [...reorderedAssignments, ...remainingAssignments];

      const priorityList = results.map((result, index) => ({
        assignmentId: result.assignmentId,
        rank: index + 1,
        explanation: result.explanation,
      }));

      console.log(`[STORE] Setting reordered assignments, priorityList, and sortState to 'idle'`);
      set({
        assignments: updatedAssignments,
        priorityList,
        sortState: 'idle',
        sortError: null,
      });

      scheduleSave({ ...get() });
    } catch (err) {
      console.error(`[STORE] Error during prioritization:`, err);
      
      let errorMessage: string;
      if (err instanceof GeminiServiceError) {
        switch (err.kind) {
          case 'http':
            errorMessage = err.message;
            break;
          case 'timeout':
            errorMessage = 'Request timed out. Please try again.';
            break;
          case 'parse':
            errorMessage = 'Could not parse the AI response. Please try again.';
            break;
          default:
            errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }

      console.log(`[STORE] Prioritization failed: ${errorMessage}`);
      set({
        priorityList: [],
        sortState: 'error',
        sortError: errorMessage,
      });

      scheduleSave({ ...get() });
    }
  },
}));

// ---------------------------------------------------------------------------
// Store hydration from localStorage
// ---------------------------------------------------------------------------

{
  const STORAGE_KEY = 'huskyPlanner_v1';
  const rawExists = localStorage.getItem(STORAGE_KEY) !== null;
  const loaded = storageService.load();

  if (loaded !== null) {
    // Merge persisted fields into the store's initial state
    usePlannerStore.setState({
      classes: loaded.classes,
      assignments: loaded.assignments,
      selectedClassId: loaded.selectedClassId,
    });
  } else if (rawExists) {
    // Key existed but load() returned null — data was corrupted
    usePlannerStore.setState({
      persistenceError:
        'Some previously saved data could not be loaded and has been discarded.',
    });
  }
  // If rawExists is false, this is a fresh start — do nothing
}

export default usePlannerStore;
