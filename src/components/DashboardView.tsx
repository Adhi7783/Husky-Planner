import { usePlannerStore } from '../store/plannerStore';
import { AddClassForm } from './AddClassForm';
import { PriorityListPanel } from './PriorityListPanel';

/**
 * DashboardView
 *
 * Main dashboard that displays the student's class list and AI priority sort controls.
 *
 * Rendering rules:
 * - When no classes exist: shows an empty-state message and the AddClassForm; no sort button.
 * - When classes exist: renders the class list ordered by `createdAt` ascending (insertion order),
 *   a "Sort by Priority" button (disabled while `sortState === 'loading'`), and the AddClassForm.
 * - Each class item is clickable and calls `selectClass(cls.id)`.
 * - Each class item has a delete button that calls `deleteClass(cls.id)`.
 * - `PriorityListPanel` is rendered when `priorityList.length > 0` OR `sortState !== 'idle'`.
 *
 * Requirements: 1.5, 1.6, 3.5, 5.1, 5.2
 */
export function DashboardView() {
  const classes = usePlannerStore((state) => state.classes);
  const sortState = usePlannerStore((state) => state.sortState);
  const priorityList = usePlannerStore((state) => state.priorityList);
  const selectClass = usePlannerStore((state) => state.selectClass);
  const deleteClass = usePlannerStore((state) => state.deleteClass);
  const requestPrioritySort = usePlannerStore((state) => state.requestPrioritySort);

  const hasClasses = classes.length > 0;
  const showPriorityPanel = priorityList.length > 0 || sortState !== 'idle';

  return (
    <main>
      <h1>Husky Planner</h1>

      {hasClasses ? (
        <>
          {/* Sort by Priority button — only shown when at least one class exists */}
          <button
            type="button"
            onClick={() => void requestPrioritySort()}
            disabled={sortState === 'loading'}
            aria-label="Sort assignments by priority"
          >
            Sort by Priority
          </button>

          {/* Priority list panel — shown when list is non-empty or sort is in progress/error */}
          {showPriorityPanel && <PriorityListPanel />}

          {/* Class list ordered by createdAt ascending (insertion order) */}
          <section aria-label="Class list">
            <h2>Your Classes</h2>
            <ul>
              {classes.map((cls) => (
                <li key={cls.id}>
                  {/* Clicking the class name navigates to the class detail view */}
                  <button
                    type="button"
                    onClick={() => selectClass(cls.id)}
                    aria-label={`View class ${cls.name}`}
                  >
                    {cls.name}
                  </button>

                  {/* Delete button for the class */}
                  <button
                    type="button"
                    onClick={() => deleteClass(cls.id)}
                    aria-label={`Delete class ${cls.name}`}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        /* Empty-state message when no classes exist */
        <p role="status">No classes yet. Add your first class below.</p>
      )}

      {/* Add class form is always visible */}
      <AddClassForm />
    </main>
  );
}

export default DashboardView;
