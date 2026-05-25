import { usePlannerStore } from '../store/plannerStore';
import { AddAssignmentForm } from './AddAssignmentForm';

export function ClassDetailView() {
  const selectedClassId = usePlannerStore((state) => state.selectedClassId);
  const classes = usePlannerStore((state) => state.classes);
  const assignments = usePlannerStore((state) => state.assignments);
  const deleteAssignment = usePlannerStore((state) => state.deleteAssignment);
  const toggleAssignmentComplete = usePlannerStore((state) => state.toggleAssignmentComplete);
  const selectClass = usePlannerStore((state) => state.selectClass);

  const selectedClass = classes.find((cls) => cls.id === selectedClassId);

  if (!selectedClass) {
    return null;
  }

  // Filter assignments for this class in the canonical store order.
  const classAssignments = assignments.filter((a) => a.classId === selectedClass.id);

  return (
    <div className="dashboard-view">
      <section className="page-card detail-header">
        <button type="button" onClick={() => selectClass(null)} className="ghost-button">
          Back
        </button>

        <div>
          <p className="eyebrow">Class detail</p>
          <h2>{selectedClass.name}</h2>
        </div>
      </section>

      {classAssignments.length === 0 ? (
        <section className="page-card empty-state" role="status">
          <h3>No assignments yet</h3>
          <p>Add your first assignment below for this class.</p>
        </section>
      ) : (
        <section className="page-card">
          <h3>Assignments</h3>
          <ul aria-label="Assignments" className="assignment-list">
          {classAssignments.map((assignment) => (
            <li key={assignment.id} className="assignment-row">
              <div className="assignment-main">
                <strong>{assignment.name}</strong>
                <span className="assignment-meta">Due {assignment.dueDate}</span>
                {assignment.description !== undefined && (
                  <span className="assignment-description">{assignment.description}</span>
                )}
              </div>

              <label className="status-toggle">
                <input
                  type="checkbox"
                  checked={assignment.completed}
                  onChange={() =>
                    toggleAssignmentComplete(assignment.classId, assignment.id)
                  }
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
                onClick={() =>
                  deleteAssignment(assignment.classId, assignment.id)
                }
                aria-label={`Delete assignment "${assignment.name}"`}
                className="ghost-button danger-button"
              >
                Delete
              </button>
            </li>
          ))}
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
