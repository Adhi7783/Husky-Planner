import React, { useState } from 'react';
import { validateAssignmentFields } from '../utils/validation';
import { usePlannerStore } from '../store/plannerStore';

interface AddAssignmentFormProps {
  classId: string;
}

export function AddAssignmentForm({ classId }: AddAssignmentFormProps) {
  const addAssignment = usePlannerStore((state) => state.addAssignment);

  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateAssignmentFields(name, dueDate);

    if (Object.keys(validationErrors).length > 0) {
      // Display per-field errors; do NOT clear fields that passed validation
      setErrors(validationErrors);
      return;
    }

    // Validation passed — add the assignment and clear all fields
    addAssignment(classId, {
      name,
      dueDate,
      description: description.trim() !== '' ? description : undefined,
    });

    setName('');
    setDueDate('');
    setDescription('');
    setErrors({});
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Add assignment">
      <div>
        <label htmlFor="assignment-name">Assignment Name</label>
        <input
          id="assignment-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby={errors.name ? 'assignment-name-error' : undefined}
          aria-invalid={errors.name ? 'true' : undefined}
        />
        {errors.name && (
          <span id="assignment-name-error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="assignment-due-date">Due Date</label>
        <input
          id="assignment-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-describedby={errors.dueDate ? 'assignment-due-date-error' : undefined}
          aria-invalid={errors.dueDate ? 'true' : undefined}
        />
        {errors.dueDate && (
          <span id="assignment-due-date-error" role="alert">
            {errors.dueDate}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="assignment-description">Description (optional)</label>
        <textarea
          id="assignment-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <button type="submit">Add Assignment</button>
    </form>
  );
}

export default AddAssignmentForm;
