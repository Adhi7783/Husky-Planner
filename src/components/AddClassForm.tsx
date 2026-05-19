import { useState } from 'react';
import { usePlannerStore } from '../store/plannerStore';
import { validateClassName } from '../utils/validation';

/**
 * AddClassForm
 *
 * Controlled form for adding a new class to the planner.
 * - Validates the class name on submit using `validateClassName`.
 * - Displays an inline error adjacent to the name input on failure (input is NOT cleared).
 * - On valid submit: calls `addClass` from the Zustand store and clears the input.
 *
 * Requirements: 1.1, 1.2, 1.3, 5.5
 */
export function AddClassForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const classes = usePlannerStore((state) => state.classes);
  const addClass = usePlannerStore((state) => state.addClass);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationError = validateClassName(name, classes);

    if (validationError !== null) {
      // Validation failed: show error, do NOT clear the input
      setError(validationError);
      return;
    }

    // Validation passed: add the class and clear the input
    addClass(name);
    setName('');
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="class-name-input">Class Name</label>
        <input
          id="class-name-input"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            // Clear error as the user edits the field
            if (error !== null) setError(null);
          }}
          aria-describedby={error ? 'class-name-error' : undefined}
          aria-invalid={error !== null ? true : undefined}
        />
        {error !== null && (
          <span id="class-name-error" role="alert">
            {error}
          </span>
        )}
      </div>
      <button type="submit">Add Class</button>
    </form>
  );
}

export default AddClassForm;
