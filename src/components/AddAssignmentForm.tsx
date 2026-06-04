import React, { useState } from 'react';
import { validateAssignmentFields } from '../utils/validation';
import { usePlannerStore } from '../store/plannerStore';

interface AddAssignmentFormProps {
  classId: string;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very Hard',
};

export function AddAssignmentForm({ classId }: AddAssignmentFormProps) {
  const addAssignment = usePlannerStore((state) => state.addAssignment);

  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState<string>('');
  const [difficulty, setDifficulty] = useState<number>(3);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateAssignmentFields(name, dueDate, weight);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    addAssignment(classId, {
      name,
      dueDate,
      description: description.trim() !== '' ? description : undefined,
      weight: weight !== '' ? Number(weight) : undefined,
      difficulty,
    });

    setName('');
    setDueDate('');
    setDescription('');
    setWeight('');
    setDifficulty(3);
    setErrors({});
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Add assignment">
      <h3 style={{ margin: '0 0 0.5rem' }}>Add Assignment</h3>

      <div>
        <label htmlFor="assignment-name">Assignment Name</label>
        <input
          id="assignment-name"
          type="text"
          value={name}
          placeholder="e.g. Homework 3, Midterm Exam…"
          onChange={(e) => setName(e.target.value)}
          aria-describedby={errors.name ? 'assignment-name-error' : undefined}
          aria-invalid={errors.name ? 'true' : undefined}
        />
        {errors.name && (
          <span id="assignment-name-error" role="alert" className="field-error">
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
          <span id="assignment-due-date-error" role="alert" className="field-error">
            {errors.dueDate}
          </span>
        )}
      </div>

      {/* Grade weight and difficulty side by side */}
      <div className="assignment-meta-row">
        <div>
          <label htmlFor="assignment-weight">
            Grade Weight (%)
            <span className="field-hint"> — optional</span>
          </label>
          <input
            id="assignment-weight"
            type="number"
            min="0"
            max="100"
            step="1"
            value={weight}
            placeholder="e.g. 20"
            onChange={(e) => setWeight(e.target.value)}
            aria-describedby={errors.weight ? 'assignment-weight-error' : undefined}
            aria-invalid={errors.weight ? 'true' : undefined}
          />
          {errors.weight && (
            <span id="assignment-weight-error" role="alert" className="field-error">
              {errors.weight}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="assignment-difficulty">
            Assignment Difficulty
            <span className="difficulty-inline-badge"> {difficulty}/5 — {DIFFICULTY_LABELS[difficulty]}</span>
          </label>
          <div className="difficulty-slider-row">
            <span className="slider-label">Easy</span>
            <input
              id="assignment-difficulty"
              type="range"
              min={1}
              max={5}
              step={1}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="difficulty-slider"
              aria-label={`Assignment difficulty: ${difficulty} — ${DIFFICULTY_LABELS[difficulty]}`}
            />
            <span className="slider-label">Hard</span>
            <div className="slider-pips" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`pip${difficulty >= n ? ' pip-active' : ''}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="assignment-description">
          Notes / Description
          <span className="field-hint"> — optional, helps AI prioritize</span>
        </label>
        <textarea
          id="assignment-description"
          value={description}
          placeholder="e.g. Requires reading chapters 5–7, implementing a BST…"
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <button type="submit">Add Assignment</button>
    </form>
  );
}

export default AddAssignmentForm;
