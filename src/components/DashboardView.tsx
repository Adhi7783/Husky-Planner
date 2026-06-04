import { usePlannerStore } from '../store/plannerStore';
import { AddClassForm } from './AddClassForm';
import { PriorityListPanel } from './PriorityListPanel';

const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#4ade80',
  2: '#a3e635',
  3: '#facc15',
  4: '#fb923c',
  5: '#f87171',
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very Hard',
};

/**
 * DashboardView
 *
 * Main dashboard that displays the student's class list and AI priority sort controls.
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
  const assignments = usePlannerStore((state) => state.assignments);

  const hasClasses = classes.length > 0;
  const showPriorityPanel = priorityList.length > 0 || sortState !== 'idle';

  const handleSortClick = () => {
    void requestPrioritySort();
  };

  return (
    <main className="dashboard-view">
      <section className="page-card dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Your classes</h2>
          <p className="section-copy">
            Add classes, track assignments by grade weight and difficulty, and let AI sort what needs attention first.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSortClick}
          disabled={sortState === 'loading' || !hasClasses}
          aria-label="Sort assignments by priority using AI"
        >
          {sortState === 'loading' ? 'Analyzing…' : '✦ AI Priority Sort'}
        </button>
      </section>

      {hasClasses ? (
        <>
          {showPriorityPanel && <PriorityListPanel />}

          <section className="page-card" aria-label="Class list">
            <h2>Your Classes</h2>
            <ul>
              {classes.map((cls) => {
                const classAssignmentCount = assignments.filter((a) => a.classId === cls.id).length;
                const incompleteCount = assignments.filter((a) => a.classId === cls.id && !a.completed).length;
                const difficulty = cls.difficulty ?? 3;
                const diffColor = DIFFICULTY_COLORS[difficulty] ?? '#facc15';
                const diffLabel = DIFFICULTY_LABELS[difficulty] ?? 'Moderate';

                return (
                  <li key={cls.id} className="class-row">
                    <button
                      type="button"
                      onClick={() => selectClass(cls.id)}
                      aria-label={`View class ${cls.name}`}
                      className="class-button"
                    >
                      <span className="class-pill">Class</span>
                      <strong>{cls.name}</strong>

                      {/* Difficulty badge */}
                      <span
                        className="difficulty-tag"
                        style={{ '--diff-color': diffColor } as React.CSSProperties}
                        title={`Course difficulty: ${difficulty}/5 — ${diffLabel}`}
                        aria-label={`Difficulty ${difficulty} out of 5: ${diffLabel}`}
                      >
                        {'●'.repeat(difficulty)}{'○'.repeat(5 - difficulty)}
                        <span className="diff-label">{diffLabel}</span>
                      </span>

                      {/* Assignment count */}
                      {classAssignmentCount > 0 && (
                        <span className="class-assignment-count" aria-label={`${incompleteCount} incomplete assignments`}>
                          {incompleteCount > 0
                            ? `${incompleteCount} pending`
                            : `${classAssignmentCount} done`}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteClass(cls.id)}
                      aria-label={`Delete class ${cls.name}`}
                      className="ghost-button danger-button"
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : (
        <section className="page-card empty-state" role="status">
          <h3>No classes yet</h3>
          <p>Add your first class below — start typing a CSS course name for autocomplete.</p>
        </section>
      )}

      <section className="page-card">
        <AddClassForm />
      </section>
    </main>
  );
}

export default DashboardView;
