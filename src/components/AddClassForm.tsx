import { useState } from 'react';
import { usePlannerStore } from '../store/plannerStore';
import { validateClassName } from '../utils/validation';

/**
 * UWB CSS course list with pre-filled difficulty ratings (1–5).
 * Covers common courses in the CSS program at UW Bothell.
 */
const UWB_CSS_COURSES: { name: string; difficulty: number }[] = [
  { name: 'CSS 101: Digital Thinking', difficulty: 1 },
  { name: 'CSS 112: Intro to Programming', difficulty: 2 },
  { name: 'CSS 143: Computer Programming II', difficulty: 3 },
  { name: 'CSS 161: Fundamentals of Computing', difficulty: 2 },
  { name: 'CSS 162: Programming Methodology', difficulty: 3 },
  { name: 'CSS 301: Technical Writing', difficulty: 4 },
  { name: 'CSS 310: Information Assurance and Cybersecurity', difficulty: 4 },
  { name: 'CSS 340: Applied Algorithmics', difficulty: 5 },
  { name: 'CSS 343: Data Structures, Algorithms, Discrete Math', difficulty: 5 },
  { name: 'CSS 360: Software Engineering', difficulty: 3 },
  { name: 'CSS 370: Analysis and Design', difficulty: 2 },
  { name: 'CSS 383: Bioinformatics', difficulty: 3 },
  { name: 'CSS 390: ST: Special Topics in CSS', difficulty: 3 },
  { name: 'CSS 422: Hardware and Computer Organization', difficulty: 4 },
  { name: 'CSS 430: Operating Systems', difficulty: 5 },
  { name: 'CSS 432: Computer Networks', difficulty: 4 },
  { name: 'CSS 436: Cloud Computing', difficulty: 4 },
  { name: 'CSS 450: Computer Graphics', difficulty: 4 },
  { name: 'CSS 451: 3D Computer Graphics', difficulty: 4 },
  { name: 'CSS 452: Game Engine Development', difficulty: 5 },
  { name: 'CSS 458: Computer Simulation', difficulty: 4 },
  { name: 'CSS 475: Database Systems', difficulty: 4 },
  { name: 'CSS 481: Web Programming and Applications', difficulty: 5 },
  { name: 'CSS 484: Multimedia Data Processing', difficulty: 4 },
  { name: 'CSS 487: Computer Vision', difficulty: 5 },
  { name: 'CSS 490: Software Engineering Capstone I', difficulty: 3 },
  { name: 'CSS 491: Software Engineering Capstone II', difficulty: 4 },
  { name: 'CSS 497: Internship', difficulty: 1 },
  { name: 'MATH 125: Calculus I', difficulty: 4 },
  { name: 'MATH 126: Calculus II', difficulty: 4 },
  { name: 'MATH 208: Matrix Algebra', difficulty: 3 },
  { name: 'STMATH 390: Statistical Methods', difficulty: 3 },
  { name: 'STMATH 394: Probability I', difficulty: 4 },
];

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very Hard',
};

/**
 * AddClassForm
 *
 * Controlled form for adding a new class to the planner.
 * - Supports UWB CSS course autocomplete with pre-filled difficulty.
 * - Validates the class name on submit using `validateClassName`.
 * - Displays an inline error adjacent to the name input on failure.
 * - On valid submit: calls `addClass` from the Zustand store and clears inputs.
 *
 * Requirements: 1.1, 1.2, 1.3, 5.5
 */
export function AddClassForm() {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const classes = usePlannerStore((state) => state.classes);
  const addClass = usePlannerStore((state) => state.addClass);

  // Filter suggestions based on current input
  const suggestions = name.trim().length >= 2
    ? UWB_CSS_COURSES.filter((c) =>
        c.name.toLowerCase().includes(name.trim().toLowerCase())
      ).slice(0, 6)
    : [];

  function handleSuggestionClick(course: { name: string; difficulty: number }) {
    setName(course.name);
    setDifficulty(course.difficulty);
    setShowSuggestions(false);
    if (error !== null) setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShowSuggestions(false);

    const validationError = validateClassName(name, classes);

    if (validationError !== null) {
      setError(validationError);
      return;
    }

    addClass(name, difficulty);
    setName('');
    setDifficulty(3);
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Add class">
      <h3 style={{ margin: '0 0 0.5rem' }}>Add a Class</h3>

      <div style={{ position: 'relative' }}>
        <label htmlFor="class-name-input">Class Name</label>
        <input
          id="class-name-input"
          type="text"
          value={name}
          placeholder="e.g. CSS 343 or start typing to search UWB courses…"
          onChange={(e) => {
            setName(e.target.value);
            setShowSuggestions(true);
            if (error !== null) setError(null);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => setShowSuggestions(true)}
          aria-describedby={error ? 'class-name-error' : undefined}
          aria-invalid={error !== null ? true : undefined}
          autoComplete="off"
        />
        {error !== null && (
          <span id="class-name-error" role="alert" className="field-error">
            {error}
          </span>
        )}

        {/* UWB course autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="course-suggestions" role="listbox" aria-label="UWB CSS course suggestions">
            {suggestions.map((course) => (
              <li
                key={course.name}
                role="option"
                aria-selected={false}
                onMouseDown={() => handleSuggestionClick(course)}
                className="course-suggestion-item"
              >
                <span className="suggestion-name">{course.name}</span>
                <span className="suggestion-difficulty">
                  {'★'.repeat(course.difficulty)}{'☆'.repeat(5 - course.difficulty)}
                  <span className="suggestion-difficulty-label"> {DIFFICULTY_LABELS[course.difficulty]}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Course difficulty slider */}
      <div>
        <label htmlFor="class-difficulty">
          Course Difficulty
          <span className="difficulty-badge difficulty-{difficulty}" aria-hidden="true">
            {' '}{difficulty}/5 — {DIFFICULTY_LABELS[difficulty]}
          </span>
        </label>
        <div className="difficulty-slider-row">
          <span className="slider-label">Easy</span>
          <input
            id="class-difficulty"
            type="range"
            min={1}
            max={5}
            step={1}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="difficulty-slider"
            aria-label={`Course difficulty: ${difficulty} out of 5 — ${DIFFICULTY_LABELS[difficulty]}`}
          />
          <span className="slider-label">Hard</span>
          <div className="slider-pips" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`pip${difficulty >= n ? ' pip-active' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <button type="submit">Add Class</button>
    </form>
  );
}

export default AddClassForm;
