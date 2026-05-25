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

  // Log render to detect StrictMode double invocation
  console.log(`[DASHBOARD] Rendering with sortState=${sortState}, priorityList.length=${priorityList.length}`);

  const handleSortClick = async () => {
    console.log(`[DASHBOARD] Sort button clicked`);
    await requestPrioritySort();
  };

  return (
    <main className="dashboard-view">
      <section className="page-card dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Your classes</h2>
          <p className="section-copy">
            Add classes, track assignments, and sort the day by what needs attention first.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSortClick}
          disabled={sortState === 'loading' || !hasClasses}
          aria-label="Sort assignments by priority"
        >
          {sortState === 'loading' ? 'Sorting…' : 'Sort by Priority'}
        </button>
      </section>

      {hasClasses ? (
        <>
          {/* Priority list panel — shown when list is non-empty or sort is in progress/error */}
          {showPriorityPanel && <PriorityListPanel />}

          {/* Class list ordered by createdAt ascending (insertion order) */}
          <section className="page-card" aria-label="Class list">
            <h2>Your Classes</h2>
            <ul>
              {classes.map((cls) => (
                <li key={cls.id} className="class-row">
                  {/* Clicking the class name navigates to the class detail view */}
                  <button type="button" onClick={() => selectClass(cls.id)} aria-label={`View class ${cls.name}`} className="class-button">
                    <span className="class-pill">Class</span>
                    <strong>{cls.name}</strong>
                  </button>

                  {/* Delete button for the class */}
                  <button type="button" onClick={() => deleteClass(cls.id)} aria-label={`Delete class ${cls.name}`} className="ghost-button danger-button">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        /* Empty-state message when no classes exist */
        <section className="page-card empty-state" role="status">
          <h3>No classes yet</h3>
          <p>Add your first class below to start building your schedule.</p>
        </section>
      )}

      {/* Add class form is always visible */}
      <section className="page-card">
        <AddClassForm />
      </section>
    </main>
  );
}

export default DashboardView;
