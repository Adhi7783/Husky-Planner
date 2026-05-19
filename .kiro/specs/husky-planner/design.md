# Design Document: Husky Planner

## Overview

Husky Planner is a single-page web application (SPA) built with React and TypeScript. Students manage their enrolled classes and assignments through a two-view interface: a main dashboard and a class detail view. A Gemini AI integration analyzes all incomplete assignments and returns a prioritized list with explanations. All data is persisted to `localStorage` so the planner survives page refreshes.

The application has no backend server — it runs entirely in the browser. The only external dependency is the Google Gemini API, called directly from the client using a user-supplied or environment-configured API key.

**Technology choices:**
- **React 18 + TypeScript** — component model, strong typing, wide ecosystem
- **Vite** — fast dev server and build tool for SPAs
- **Zustand** — lightweight state management (simpler than Redux for this scope)
- **date-fns** — date parsing and formatting utilities
- **fast-check** — property-based testing library for TypeScript
- **Vitest + React Testing Library** — unit and component testing

---

## Architecture

The application follows a layered architecture with clear separation between UI, state, and services.

```
┌─────────────────────────────────────────────────────┐
│                    React UI Layer                    │
│  DashboardView  │  ClassDetailView  │  PriorityList  │
└────────────────────────┬────────────────────────────┘
                         │ reads / dispatches
┌────────────────────────▼────────────────────────────┐
│               Zustand Store (plannerStore)           │
│  classes[]  │  selectedClassId  │  priorityList      │
│  uiState    │  persistenceError │  sortState         │
└──────────┬──────────────────────────────────────────┘
           │ calls                          │ calls
┌──────────▼──────────┐        ┌────────────▼──────────┐
│  StorageService     │        │  GeminiService         │
│  (localStorage I/O) │        │  (Gemini API client)   │
└─────────────────────┘        └───────────────────────┘
```

**Data flow for a typical mutation:**
1. User action triggers a store action (e.g., `addClass`).
2. Store updates in-memory state synchronously.
3. Store schedules a `StorageService.save()` call (debounced, ≤500 ms).
4. React re-renders the affected components.

**Data flow for AI priority sort:**
1. User clicks "Sort by Priority".
2. Store collects all incomplete assignments and calls `GeminiService.prioritize()`.
3. Store sets `sortState = 'loading'` and disables the sort button.
4. On success, store sets `priorityList` and `sortState = 'idle'`.
5. On failure, store sets `sortState = 'error'` with an error message.

---

## Components and Interfaces

### View Components

#### `DashboardView`
- Renders the class list (ordered by creation time).
- Shows the "Sort by Priority" button when at least one class exists.
- Shows an empty-state message when no classes exist.
- Renders the `PriorityListPanel` when a priority list is available.
- Contains the `AddClassForm`.

#### `ClassDetailView`
- Renders when a class is selected.
- Shows class name, assignment list (ordered by due date ascending), and `AddAssignmentForm`.
- Each assignment row has complete/incomplete toggle and delete button.
- Back button navigates to dashboard, preserving `selectedClassId` in store.

#### `AddClassForm`
- Controlled input for class name.
- Inline validation: empty/whitespace → error, duplicate name → error.
- On valid submit: calls `addClass` action, clears input.

#### `AddAssignmentForm`
- Controlled inputs: name (required), due date (required), description (optional).
- Inline validation per field; does not clear valid field values on failed submit.
- On valid submit: calls `addAssignment` action, clears all fields.

#### `PriorityListPanel`
- Renders the ordered priority list returned by Gemini.
- Each item shows: assignment name, class name, due date, and AI explanation.
- Shows loading spinner while `sortState === 'loading'`.
- Shows error message when `sortState === 'error'`.

### Service Interfaces

```typescript
// StorageService
interface StorageService {
  save(state: PlannerState): void;
  load(): PlannerState | null;
}

// GeminiService
interface GeminiService {
  prioritize(assignments: AssignmentPayload[]): Promise<PriorityResult[]>;
}

interface AssignmentPayload {
  id: string;
  name: string;
  dueDate: string;       // ISO 8601 date string
  className: string;
  description?: string;
}

interface PriorityResult {
  assignmentId: string;
  explanation: string;   // must reference at least one concrete factor
}
```

### Store Actions

```typescript
interface PlannerActions {
  addClass(name: string): void;
  deleteClass(classId: string): void;
  addAssignment(classId: string, assignment: NewAssignment): void;
  deleteAssignment(classId: string, assignmentId: string): void;
  toggleAssignmentComplete(classId: string, assignmentId: string): void;
  selectClass(classId: string | null): void;
  requestPrioritySort(): Promise<void>;
}
```

---

## Data Models

```typescript
interface Class {
  id: string;           // UUID v4
  name: string;         // trimmed, non-empty
  createdAt: number;    // Date.now() at creation
}

interface Assignment {
  id: string;           // UUID v4
  classId: string;      // foreign key → Class.id
  name: string;         // trimmed, non-empty
  dueDate: string;      // ISO 8601 date string (YYYY-MM-DD)
  description?: string; // optional, stored as-is
  completed: boolean;
  createdAt: number;    // Date.now() at creation
}

interface PlannerState {
  classes: Class[];
  assignments: Assignment[];
  selectedClassId: string | null;
  priorityList: PriorityItem[];
  sortState: 'idle' | 'loading' | 'error';
  sortError: string | null;
  persistenceError: string | null;
}

interface PriorityItem {
  assignmentId: string;
  rank: number;
  explanation: string;
}
```

**localStorage schema:**
```json
{
  "huskyPlanner_v1": {
    "classes": [...],
    "assignments": [...],
    "selectedClassId": "uuid-or-null"
  }
}
```

The `priorityList`, `sortState`, and `persistenceError` fields are ephemeral and are not persisted to `localStorage`.

**Atomic class deletion:** The store deletes the class and all assignments with matching `classId` in a single `setState` call. Because Zustand state updates are synchronous and atomic within a single call, partial deletion cannot occur. If the subsequent `StorageService.save()` fails, the in-memory state is already consistent and the user is notified via `persistenceError`.

**Corrupted data recovery:** On load, `StorageService.load()` attempts `JSON.parse`. If parsing fails entirely, it returns `null` (empty state). If parsing succeeds but individual entries fail schema validation (checked with a type guard), valid entries are kept and invalid ones are discarded.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid class addition is reflected in the class list

*For any* non-empty, non-whitespace-only class name, after calling `addClass`, the resulting class list SHALL contain exactly one class whose trimmed name matches the input, and that class SHALL have a unique identifier not shared by any other class.

**Validates: Requirements 1.1**

---

### Property 2: Whitespace and empty class names are rejected

*For any* string composed entirely of whitespace characters (including the empty string), calling `addClass` SHALL leave the class list unchanged.

**Validates: Requirements 1.2**

---

### Property 3: Duplicate class names (case-insensitive) are rejected

*For any* existing class name, attempting to add a class whose name — after trimming — matches the existing name case-insensitively SHALL leave the class list unchanged.

**Validates: Requirements 1.3**

---

### Property 4: Class deletion removes the class and all its assignments atomically

*For any* class with any number of associated assignments, after calling `deleteClass`, neither the class nor any of its assignments SHALL appear in the resulting state.

**Validates: Requirements 1.4**

---

### Property 5: Classes are displayed in insertion order

*For any* sequence of `addClass` calls, the resulting class list SHALL be ordered by `createdAt` ascending, matching the order in which the classes were added.

**Validates: Requirements 1.5**

---

### Property 6: Valid assignment addition is reflected in the assignment list

*For any* class and any assignment with a non-empty name and a valid ISO 8601 due date, after calling `addAssignment`, the class's assignment list SHALL contain the new assignment with all provided fields preserved (name, dueDate, description if given).

**Validates: Requirements 2.1, 2.7**

---

### Property 7: Invalid assignment inputs are rejected without clearing valid fields

*For any* combination of valid and invalid assignment fields (empty name, invalid due date), submitting the form SHALL leave the assignment list unchanged, and the values of fields that passed validation SHALL remain in the form inputs.

**Validates: Requirements 2.2, 2.3, 5.5**

---

### Property 8: Completing and un-completing an assignment is a round trip

*For any* incomplete assignment, calling `toggleAssignmentComplete` twice SHALL return the assignment to its original `completed: false` state, and the assignment SHALL be included in the Gemini API payload after the second toggle.

**Validates: Requirements 2.4, 2.5**

---

### Property 9: Assignments are displayed in ascending due-date order

*For any* set of assignments belonging to a class, the displayed list SHALL be ordered by `dueDate` ascending regardless of the order in which assignments were added.

**Validates: Requirements 2.8**

---

### Property 10: Priority sort payload contains exactly the incomplete assignments

*For any* mix of complete and incomplete assignments, the payload sent to `GeminiService.prioritize` SHALL contain exactly the incomplete assignments — no more, no fewer — each with name, dueDate, className, and description (if present).

**Validates: Requirements 3.1**

---

### Property 11: API errors preserve all class and assignment data

*For any* application state, when `GeminiService.prioritize` throws or returns an error, the classes and assignments in the store SHALL be identical to their state before the sort request was initiated.

**Validates: Requirements 3.4**

---

### Property 12: No API call is made when there are no incomplete assignments

*For any* state where all assignments are marked complete or no assignments exist, calling `requestPrioritySort` SHALL NOT invoke `GeminiService.prioritize` and SHALL set an appropriate informational message.

**Validates: Requirements 3.6**

---

### Property 13: Every mutation is reflected in localStorage

*For any* sequence of `addClass`, `deleteClass`, `addAssignment`, `deleteAssignment`, or `toggleAssignmentComplete` calls, the data written to `localStorage` SHALL reflect the resulting in-memory state (classes and assignments arrays are equal after deserialization).

**Validates: Requirements 4.1**

---

### Property 14: App load restores previously saved state

*For any* valid `PlannerState` written to `localStorage`, loading the application SHALL restore all classes and assignments to match the saved state exactly.

**Validates: Requirements 4.3**

---

### Property 15: Corrupted localStorage entries are skipped; valid entries are restored

*For any* `localStorage` payload containing a mix of valid and invalid class/assignment entries, loading the application SHALL restore all valid entries and discard only the invalid ones.

**Validates: Requirements 4.4**

---

### Property 16: Class detail view renders all required fields for any class

*For any* class with any set of assignments, the class detail view SHALL display the class name, each assignment's name, due date, completion status, and description (when present), along with add and delete controls.

**Validates: Requirements 5.3**

---

### Property 17: Selected class identity is preserved across navigation

*For any* selected class, navigating to the dashboard and back SHALL restore the same class detail view with all assignment data intact.

**Validates: Requirements 5.4**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Empty/whitespace class name | Inline error adjacent to name field; form not submitted |
| Duplicate class name | Inline error adjacent to name field; form not submitted |
| Empty assignment name | Inline error adjacent to name field; other field values preserved |
| Invalid/missing due date | Inline error adjacent to due date field; other field values preserved |
| Gemini API HTTP error | Error banner with status code; sort button re-enabled; data unchanged |
| Gemini API timeout | Error banner indicating timeout; sort button re-enabled; data unchanged |
| Gemini API unparseable response | Error banner indicating parse failure; sort button re-enabled; data unchanged |
| localStorage write failure | Non-blocking toast notification; in-memory state retained for session |
| localStorage corrupted data | Valid entries recovered; notification shown if any data lost; empty state if nothing recoverable |
| No incomplete assignments for sort | Informational message; no API call made |

**Error message guidelines:**
- Validation errors: appear inline, adjacent to the offending field, immediately on submit.
- API errors: appear as a dismissible banner above the priority list area.
- Persistence errors: appear as a non-blocking toast (auto-dismiss after 5 seconds).
- Recovery notifications: appear as a persistent banner until dismissed.

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)

Focus on specific examples, edge cases, and integration points:

- `StorageService`: save/load round trip, corrupted data recovery, quota-exceeded error handling.
- `GeminiService`: request payload construction, response parsing, error propagation.
- Store actions: each action with concrete examples (add, delete, toggle, sort guard).
- Form components: validation error display, field value preservation on failed submit.
- `PriorityListPanel`: loading state, error state, successful render with mock data.
- Empty-state rendering for dashboard and class detail view.
- Sort button visibility (hidden when no classes, disabled during loading).

### Property-Based Tests (fast-check + Vitest)

Each property test runs a minimum of **100 iterations**. Tests are tagged with the format:
`Feature: husky-planner, Property {N}: {property_text}`

Properties to implement as property-based tests:

| Property | Test target | Generator strategy |
|---|---|---|
| P1: Valid class addition | `addClass` store action | `fc.string()` filtered to non-whitespace |
| P2: Whitespace names rejected | `addClass` store action | `fc.string({ unit: 'grapheme' })` filtered to whitespace-only |
| P3: Duplicate names rejected | `addClass` store action | Existing name + case/whitespace variants |
| P4: Atomic class deletion | `deleteClass` store action | Class with `fc.array` of assignments |
| P5: Insertion order preserved | Multiple `addClass` calls | `fc.array(fc.string())` of valid names |
| P6: Valid assignment addition | `addAssignment` store action | `fc.record` with name, date, optional description |
| P7: Invalid inputs rejected | Form validation logic | Mixed valid/invalid field combinations |
| P8: Complete/incomplete round trip | `toggleAssignmentComplete` (×2) | Any assignment |
| P9: Due-date ordering | Assignment list selector | `fc.array` of assignments with random dates |
| P10: Sort payload correctness | `requestPrioritySort` payload | Mix of complete/incomplete assignments |
| P11: API errors preserve data | `requestPrioritySort` with mock error | Any state + any error type |
| P12: No API call when no incomplete | `requestPrioritySort` guard | All-complete or empty assignment sets |
| P13: Mutations reflected in localStorage | All mutation actions | Arbitrary sequences of mutations |
| P14: App load restores state | `StorageService.load` | Any valid `PlannerState` |
| P15: Corrupted entries skipped | `StorageService.load` | Mixed valid/invalid JSON entries |
| P16: Detail view renders all fields | `ClassDetailView` component | Any class with any assignments |
| P17: Navigation preserves selection | Navigation actions | Any selected class |

### Integration Tests

- Full add-class → add-assignment → sort flow with a mocked Gemini API response.
- localStorage persistence across simulated page reload (clear module cache, re-initialize store).
- Error recovery: corrupted localStorage → app loads with notification → user can add new data.
