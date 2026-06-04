import { usePlannerStore } from '../store/plannerStore';
import { AddAssignmentForm } from './AddAssignmentForm';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very Hard',
};

export function ClassDetailView() {
  const selectedClassId = usePlannerStore((state) => state.selectedClassId);
  const classes = usePlannerStore((state) => state.classes);
  const assignments = usePlannerStore((state) => state.assignments);
  const deleteAssignment = usePlannerStore((state) => state.deleteAssignment);
  const toggleAssignmentComplete = usePlannerStore((state) => state.toggleAssignmentComplete);
  const selectClass = usePlannerStore((state) => state.selectClass);

  const selectedClass = classes.find((cls) => cls.id === selectedClassId);

  if (!selectedClass) return null;

  const classAssignments = assignments.filter((a) => a.classId === selectedClass.id);
  const classDifficulty = selectedClass.difficulty ?? 3;
  const totalWeight = classAssignments
    .filter((a) => a.weight !== undefined)
    .reduce((sum, a) => sum + (a.weight ?? 0), 0);

  return (
    <div className="dashboard-view">
      <section className="page-card detail-header">
        <button type="button" onClick={() => selectClass(null)} className="ghost-button">
          ← Back
        </button>

        <div>
          <p className="eyebrow">Class detail</p>
          <h2>{selectedClass.name}</h2>
          <p className="section-copy" style={{ margin: '0.3rem 0 0' }}>
            Course difficulty: {classDifficulty}/5 — {DIFFICULTY_LABELS[classDifficulty]}
            {totalWeight > 0 && (
              <span style={{ marginLeft: '1rem', opacity: 0.8 }}>
                · {totalWeight}% of grade tracked
              </span>
            )}
          </p>
        </div>
      </section>

      {classAssignments.length === 0 ? (
        <section className="page-card empty-state" role="status">
          <h3>No assignments yet</h3>
          <p>Add your first assignment below — include grade weight and difficulty for smarter AI prioritization.</p>
        </section>
      ) : (
        <section className="page-card">
          <h3>Assignments</h3>
          <ul aria-label="Assignments" className="assignment-list">
            {classAssignments.map((assignment) => {
              const diff = assignment.difficulty;
              const weight = assignment.weight;

              return (
                <li key={assignment.id} className={`assignment-row${assignment.completed ? ' assignment-completed' : ''}`}>
                  <div className="assignment-main">
                    <strong>{assignment.name}</strong>
                    <span className="assignment-meta">Due {assignment.dueDate}</span>

                    {/* Weight + difficulty chips */}
                    <div className="assignment-chips" aria-label="Assignment details">
                      {weight !== undefined && (
                        <span className="chip chip-weight" title="Grade weight">
                          {weight}% of grade
                        </span>
                      )}
                      {diff !== undefined && (
                        <span className="chip chip-difficulty" title={`Difficulty: ${DIFFICULTY_LABELS[diff]}`}>
                          {DIFFICULTY_LABELS[diff]}
                        </span>
                      )}
                    </div>

                    {assignment.description !== undefined && (
                      <span className="assignment-description">{assignment.description}</span>
                    )}

                    {/* AI explanation if priority sort was run */}
                    {assignment.explanation !== undefined && (
                      <span className="assignment-ai-note" aria-label="AI priority note">
                        <span aria-hidden="true">✦</span> {assignment.explanation}
                      </span>
                    )}
                  </div>

                  <label className="status-toggle">
                    <input
                      type="checkbox"
                      checked={assignment.completed}
                      onChange={() => toggleAssignmentComplete(assignment.classId, assignment.id)}
                      aria-label={
                        assignment.completed
                          ? `Mark "${assignment.name}" as incomplete`
                          : `Mark "${assignment.name}" as complete`
                      }
                    />
                    {assignment.completed ? 'Completed' : 'Incomplete'}
                  </label>

                  <button
                    type="button"
                    onClick={() => deleteAssignment(assignment.classId, assignment.id)}
                    aria-label={`Delete assignment "${assignment.name}"`}
                    className="ghost-button danger-button"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="page-card">
        <AddAssignmentForm classId={selectedClass.id} />
      </section>
    </div>
  );
}

export default ClassDetailView;
