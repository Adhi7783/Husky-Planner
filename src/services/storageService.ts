import type { Class, Assignment, PlannerState } from '../types';

function getKey(userId: string): string {
  return `huskyPlanner_v1:${userId}`;
}

/** Shape of the data persisted to localStorage (ephemeral fields excluded). */
interface PersistedState {
  classes: unknown[];
  assignments: unknown[];
  selectedClassId: unknown;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isClass(value: unknown): value is Class {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.createdAt === 'number'
    // difficulty is optional — old saved data without it is still valid
  );
}

function isAssignment(value: unknown): value is Assignment {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.classId === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.dueDate === 'string' &&
    typeof obj.completed === 'boolean' &&
    typeof obj.createdAt === 'number' &&
    (obj.description === undefined || typeof obj.description === 'string') &&
    (obj.explanation === undefined || typeof obj.explanation === 'string') &&
    (obj.weight === undefined || typeof obj.weight === 'number') &&
    (obj.difficulty === undefined || typeof obj.difficulty === 'number')
  );
}

// ---------------------------------------------------------------------------
// StorageService
// ---------------------------------------------------------------------------

/**
 * Persists and restores the subset of PlannerState that survives page reloads.
 * Ephemeral fields (priorityList, sortState, sortError, persistenceError) are
 * never written to localStorage.
 */
export const storageService = {
  /**
   * Serializes classes, assignments, and selectedClassId to localStorage.
   * Returns an Error if the write fails (e.g. quota exceeded), otherwise void.
   */
  save(state: PlannerState, userId: string): Error | void {
    const payload: PersistedState = {
      classes: state.classes,
      assignments: state.assignments,
      selectedClassId: state.selectedClassId,
    };

    try {
      localStorage.setItem(getKey(userId), JSON.stringify(payload));
    } catch (err) {
      return err instanceof Error ? err : new Error(String(err));
    }
  },

  /**
   * Loads and validates the persisted state from localStorage.
   *
   * - Returns `null` if the key is absent or the JSON cannot be parsed.
   * - Runs type-guard validation on every class and assignment entry;
   *   invalid entries are silently discarded, valid ones are kept.
   * - Returns a partial PlannerState with ephemeral fields set to defaults.
   */
  load(userId: string): PlannerState | null {
    const raw = localStorage.getItem(getKey(userId));
    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null) return null;

    const obj = parsed as Record<string, unknown>;

    const rawClasses = Array.isArray(obj.classes) ? obj.classes : [];
    const rawAssignments = Array.isArray(obj.assignments) ? obj.assignments : [];
    const selectedClassId =
      typeof obj.selectedClassId === 'string' ? obj.selectedClassId : null;

    const classes: Class[] = rawClasses.filter(isClass).map((cls) => ({
      ...cls,
      // Backfill difficulty for classes saved before this field existed
      difficulty: typeof cls.difficulty === 'number' ? cls.difficulty : 3,
    }));

    const assignments: Assignment[] = rawAssignments.filter(isAssignment);

    return {
      classes,
      assignments,
      selectedClassId,
      // Ephemeral fields — always reset to defaults on load
      priorityList: [],
      sortState: 'idle',
      sortError: null,
      persistenceError: null,
      activeUserId: '',
    };
  },
};

export default storageService;
