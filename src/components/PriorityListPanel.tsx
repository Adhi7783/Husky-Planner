import { usePlannerStore } from '../store/plannerStore';

/**
 * PriorityListPanel
 *
 * Displays the AI-generated priority list of incomplete assignments.
 *
 * Rendering rules:
 * - `sortState === 'loading'`: shows a loading spinner.
 * - `sortState === 'error'`: shows a dismissible error banner with `sortError` message.
 *   Dismissing resets sortState to 'idle' and clears sortError.
 * - `priorityList` is non-empty: renders an ordered list of PriorityItem entries,
 *   each showing assignment name, class name, due date, and AI explanation.
 *   Items whose assignmentId no longer exists in the store are silently skipped.
 * - `sortState === 'idle'` and sortError contains the "no incomplete assignments" message
 *   (or all assignments are complete): shows an informational message.
 *
 * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6
 */
export function PriorityListPanel() {
  const sortState = usePlannerStore((state) => state.sortState);
  const sortError = usePlannerStore((state) => state.sortError);
  const priorityList = usePlannerStore((state) => state.priorityList);
  const assignments = usePlannerStore((state) => state.assignments);
  const classes = usePlannerStore((state) => state.classes);

  // Dismiss the error banner: reset sortState to 'idle' and clear sortError
  function handleDismissError() {
    usePlannerStore.setState({ sortState: 'idle', sortError: null });
  }

  // Loading state
  if (sortState === 'loading') {
    return (
      <div role="status" aria-label="Loading priority list">
        <span aria-hidden="true">⏳</span> Sorting assignments by priority…
      </div>
    );
  }

  // Error state
  if (sortState === 'error') {
    return (
      <div role="alert">
        <p>{sortError ?? 'An error occurred. Please try again.'}</p>
        <button type="button" onClick={handleDismissError} aria-label="Dismiss error">
          Dismiss
        </button>
      </div>
    );
  }

  // Informational message: no incomplete assignments to prioritize
  // This is set when requestPrioritySort is called but all assignments are complete
  // or when sortError contains the "no incomplete assignments" message at idle state.
  const NO_INCOMPLETE_MSG = 'No incomplete assignments to prioritize.';
  if (
    sortState === 'idle' &&
    sortError !== null &&
    sortError === NO_INCOMPLETE_MSG
  ) {
    return (
      <div role="status">
        <p>{sortError}</p>
      </div>
    );
  }

  // Priority list
  if (priorityList.length > 0) {
    return (
      <section aria-label="Priority list">
        <h2>Priority List</h2>
        <ol>
          {priorityList.map((item) => {
            // Look up the assignment by assignmentId; skip if it no longer exists
            const assignment = assignments.find((a) => a.id === item.assignmentId);
            if (!assignment) return null;

            // Look up the parent class by classId
            const parentClass = classes.find((cls) => cls.id === assignment.classId);
            const className = parentClass?.name ?? '(Unknown class)';

            return (
              <li key={item.assignmentId}>
                <strong>{assignment.name}</strong>
                <span> — {className}</span>
                <span> | Due: {assignment.dueDate}</span>
                <p>{item.explanation}</p>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  // Nothing to render (idle, no error, no priority list)
  return null;
}

export default PriorityListPanel;
