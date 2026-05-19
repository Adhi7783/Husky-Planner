import { parseISO } from 'date-fns';
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

  // Filter assignments for this class and sort by dueDate ascending
  const classAssignments = assignments
    .filter((a) => a.classId === selectedClass.id)
    .slice()
    .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

  return (
    <div>
      <button type="button" onClick={() => selectClass(null)}>
        Back
      </button>

      <h1>{selectedClass.name}</h1>

      {classAssignments.length === 0 ? (
        <p>No assignments yet. Add your first assignment below.</p>
      ) : (
        <ul aria-label="Assignments">
          {classAssignments.map((assignment) => (
            <li key={assignment.id}>
              <span>{assignment.name}</span>
              <span>{assignment.dueDate}</span>
              <label>
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
              {assignment.description !== undefined && (
                <span>{assignment.description}</span>
              )}
              <button
                type="button"
                onClick={() =>
                  deleteAssignment(assignment.classId, assignment.id)
                }
                aria-label={`Delete assignment "${assignment.name}"`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddAssignmentForm classId={selectedClass.id} />
    </div>
  );
}

export default ClassDetailView;
