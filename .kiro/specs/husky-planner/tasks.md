# Implementation Plan: Husky Planner

## Overview

Implement a single-page React + TypeScript application using Vite, Zustand, and date-fns. The app lets students manage classes and assignments, then calls the Google Gemini API to return a prioritized assignment list. All data is persisted to `localStorage`. Implementation proceeds bottom-up: data models and services first, then the Zustand store, then UI components, then wiring.

---

## Tasks

- [x] 1. Initialize project structure and core types
  - Scaffold a Vite + React + TypeScript project (`npm create vite@latest`)
  - Install dependencies: `zustand`, `date-fns`, `fast-check`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `uuid`
  - Create `src/types/index.ts` defining `Class`, `Assignment`, `PlannerState`, `PriorityItem`, `AssignmentPayload`, `PriorityResult`, `NewAssignment`
  - Configure Vitest in `vite.config.ts` with jsdom environment and setup file
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 2. Implement StorageService
  - [x] 2.1 Implement `StorageService` in `src/services/storageService.ts`
    - Implement `save(state: PlannerState): void` — serializes `classes`, `assignments`, `selectedClassId` to `localStorage` under key `huskyPlanner_v1`; catches write errors and returns them
    - Implement `load(): PlannerState | null` — parses JSON, runs type-guard validation on each entry, discards invalid entries, returns `null` on total failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.2 Write unit tests for `StorageService`
    - Test save/load round trip with valid state
    - Test corrupted JSON returns `null`
    - Test partial corruption: valid entries recovered, invalid discarded
    - Test quota-exceeded error returns error signal without throwing
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ]* 2.3 Write property test for `StorageService` — Property 13: Every mutation reflected in localStorage
    - **Property 13: Every mutation is reflected in localStorage**
    - **Validates: Requirements 4.1**

  - [ ]* 2.4 Write property test for `StorageService` — Property 14: App load restores state
    - **Property 14: App load restores previously saved state**
    - **Validates: Requirements 4.3**

  - [ ]* 2.5 Write property test for `StorageService` — Property 15: Corrupted entries skipped
    - **Property 15: Corrupted localStorage entries are skipped; valid entries are restored**
    - **Validates: Requirements 4.4**

- [x] 3. Implement GeminiService
  - [x] 3.1 Implement `GeminiService` in `src/services/geminiService.ts`
    - Implement `prioritize(assignments: AssignmentPayload[]): Promise<PriorityResult[]>`
    - Build the Gemini API request payload; include name, dueDate, className, and description for each assignment
    - Parse the response into `PriorityResult[]`; throw a typed error on HTTP error, timeout, or unparseable response
    - Read the API key from `import.meta.env.VITE_GEMINI_API_KEY`
    - _Requirements: 3.1, 3.2, 3.4_

  - [ ]* 3.2 Write unit tests for `GeminiService`
    - Test request payload construction includes all required fields
    - Test successful response parsing into `PriorityResult[]`
    - Test HTTP error propagation
    - Test unparseable response throws typed error
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 4. Implement Zustand plannerStore — class actions
  - [x] 4.1 Create `src/store/plannerStore.ts` with initial state and `addClass` / `deleteClass` actions
    - Define initial `PlannerState`
    - `addClass(name)`: trim input, reject empty/whitespace (Property 2), reject case-insensitive duplicate (Property 3), otherwise append new `Class` with UUID and `createdAt = Date.now()`; schedule debounced `StorageService.save()` within 500 ms
    - `deleteClass(classId)`: remove class and all assignments with matching `classId` in a single `setState` call (Property 4); schedule debounced save
    - `selectClass(classId | null)`: update `selectedClassId`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1_

  - [ ]* 4.2 Write property test for `addClass` — Property 1: Valid class addition
    - **Property 1: Valid class addition is reflected in the class list**
    - **Validates: Requirements 1.1**

  - [ ]* 4.3 Write property test for `addClass` — Property 2: Whitespace names rejected
    - **Property 2: Whitespace and empty class names are rejected**
    - **Validates: Requirements 1.2**

  - [ ]* 4.4 Write property test for `addClass` — Property 3: Duplicate names rejected
    - **Property 3: Duplicate class names (case-insensitive) are rejected**
    - **Validates: Requirements 1.3**

  - [ ]* 4.5 Write property test for `deleteClass` — Property 4: Atomic class deletion
    - **Property 4: Class deletion removes the class and all its assignments atomically**
    - **Validates: Requirements 1.4**

  - [ ]* 4.6 Write property test for class ordering — Property 5: Insertion order preserved
    - **Property 5: Classes are displayed in insertion order**
    - **Validates: Requirements 1.5**

- [x] 5. Implement Zustand plannerStore — assignment actions
  - [x] 5.1 Add `addAssignment`, `deleteAssignment`, and `toggleAssignmentComplete` actions to `plannerStore.ts`
    - `addAssignment(classId, assignment)`: validate non-empty name and valid ISO 8601 date; append new `Assignment` with UUID, `classId`, and `createdAt`; schedule debounced save
    - `deleteAssignment(classId, assignmentId)`: remove assignment; if it appears in `priorityList`, remove it from there too; schedule debounced save
    - `toggleAssignmentComplete(classId, assignmentId)`: flip `completed` boolean; schedule debounced save
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 4.1_

  - [ ]* 5.2 Write property test for `addAssignment` — Property 6: Valid assignment addition
    - **Property 6: Valid assignment addition is reflected in the assignment list**
    - **Validates: Requirements 2.1, 2.7**

  - [ ]* 5.3 Write property test for `toggleAssignmentComplete` — Property 8: Complete/incomplete round trip
    - **Property 8: Completing and un-completing an assignment is a round trip**
    - **Validates: Requirements 2.4, 2.5**

- [x] 6. Implement Zustand plannerStore — priority sort action
  - [x] 6.1 Add `requestPrioritySort` action to `plannerStore.ts`
    - Guard: if no incomplete assignments exist, set an informational message and return without calling `GeminiService` (Property 12)
    - Set `sortState = 'loading'`, disable sort button
    - Collect all incomplete assignments as `AssignmentPayload[]` (Property 10)
    - Call `GeminiService.prioritize()`; on success set `priorityList` and `sortState = 'idle'`; on failure set `sortState = 'error'` with message and leave classes/assignments unchanged (Property 11)
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

  - [ ]* 6.2 Write property test for sort payload — Property 10: Payload contains exactly incomplete assignments
    - **Property 10: Priority sort payload contains exactly the incomplete assignments**
    - **Validates: Requirements 3.1**

  - [ ]* 6.3 Write property test for API error handling — Property 11: API errors preserve data
    - **Property 11: API errors preserve all class and assignment data**
    - **Validates: Requirements 3.4**

  - [ ]* 6.4 Write property test for sort guard — Property 12: No API call when no incomplete assignments
    - **Property 12: No API call is made when there are no incomplete assignments**
    - **Validates: Requirements 3.6**

- [x] 7. Implement store hydration from localStorage
  - [x] 7.1 Add store initialization logic in `plannerStore.ts`
    - On store creation, call `StorageService.load()`; if result is non-null, merge `classes`, `assignments`, and `selectedClassId` into initial state
    - If load returns `null` due to corruption, set `persistenceError` with a recovery notification message
    - _Requirements: 4.3, 4.4_

- [x] 8. Checkpoint — store and services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement form validation utilities
  - [x] 9.1 Create `src/utils/validation.ts` with `validateClassName` and `validateAssignmentFields` functions
    - `validateClassName(name, existingClasses)`: returns error string or `null`; checks empty/whitespace and case-insensitive duplicate
    - `validateAssignmentFields(name, dueDate)`: returns per-field error map; checks empty name and valid ISO 8601 date via `date-fns/isValid`
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 5.5_

  - [ ]* 9.2 Write property test for form validation — Property 7: Invalid inputs rejected without clearing valid fields
    - **Property 7: Invalid assignment inputs are rejected without clearing valid fields**
    - **Validates: Requirements 2.2, 2.3, 5.5**

- [x] 10. Implement `AddClassForm` component
  - [x] 10.1 Create `src/components/AddClassForm.tsx`
    - Controlled input for class name; calls `validateClassName` on submit
    - Displays inline error adjacent to name field on validation failure
    - On valid submit: calls `addClass` store action and clears input
    - _Requirements: 1.1, 1.2, 1.3, 5.5_

  - [ ]* 10.2 Write unit tests for `AddClassForm`
    - Test inline error shown for empty name
    - Test inline error shown for duplicate name
    - Test successful submit clears input and calls store action
    - _Requirements: 1.2, 1.3, 5.5_

- [x] 11. Implement `AddAssignmentForm` component
  - [x] 11.1 Create `src/components/AddAssignmentForm.tsx`
    - Controlled inputs: name (required), due date (required), description (optional)
    - Calls `validateAssignmentFields` on submit; displays per-field inline errors
    - On failed submit: preserves values of fields that passed validation
    - On valid submit: calls `addAssignment` store action and clears all fields
    - _Requirements: 2.1, 2.2, 2.3, 2.7, 5.5_

  - [ ]* 11.2 Write unit tests for `AddAssignmentForm`
    - Test inline error for empty name; other field values preserved
    - Test inline error for invalid due date; other field values preserved
    - Test successful submit clears all fields
    - _Requirements: 2.2, 2.3, 5.5_

- [x] 12. Implement `PriorityListPanel` component
  - [x] 12.1 Create `src/components/PriorityListPanel.tsx`
    - Renders loading spinner when `sortState === 'loading'`
    - Renders dismissible error banner when `sortState === 'error'`
    - Renders ordered list of `PriorityItem` entries: assignment name, class name, due date, AI explanation
    - Renders informational message when no incomplete assignments exist
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 12.2 Write unit tests for `PriorityListPanel`
    - Test loading spinner renders when `sortState === 'loading'`
    - Test error banner renders with message when `sortState === 'error'`
    - Test priority list renders all items with correct fields
    - Test informational message renders when no incomplete assignments
    - _Requirements: 3.2, 3.4, 3.5, 3.6_

- [x] 13. Implement `ClassDetailView` component
  - [x] 13.1 Create `src/components/ClassDetailView.tsx`
    - Renders class name, assignment list ordered by `dueDate` ascending (Property 9), and `AddAssignmentForm`
    - Each assignment row: name, due date, completion status toggle, optional description, delete button
    - Back button calls `selectClass(null)` to return to dashboard
    - Empty-state message when class has no assignments
    - _Requirements: 2.4, 2.5, 2.6, 2.8, 2.9, 5.3, 5.4_

  - [ ]* 13.2 Write property test for assignment ordering — Property 9: Due-date ordering
    - **Property 9: Assignments are displayed in ascending due-date order**
    - **Validates: Requirements 2.8**

  - [ ]* 13.3 Write property test for detail view rendering — Property 16: Detail view renders all required fields
    - **Property 16: Class detail view renders all required fields for any class**
    - **Validates: Requirements 5.3**

  - [ ]* 13.4 Write property test for navigation — Property 17: Selected class identity preserved across navigation
    - **Property 17: Selected class identity is preserved across navigation**
    - **Validates: Requirements 5.4**

- [x] 14. Implement `DashboardView` component
  - [x] 14.1 Create `src/components/DashboardView.tsx`
    - Renders class list ordered by `createdAt` ascending; each item is clickable and calls `selectClass`
    - Shows "Sort by Priority" button only when at least one class exists; button is disabled during `sortState === 'loading'`
    - Renders `PriorityListPanel` when `priorityList` is non-empty or `sortState !== 'idle'`
    - Renders `AddClassForm`
    - Empty-state message and no sort button when no classes exist
    - _Requirements: 1.5, 1.6, 3.5, 5.1, 5.2_

  - [ ]* 14.2 Write unit tests for `DashboardView`
    - Test sort button hidden when no classes
    - Test sort button disabled during loading
    - Test empty-state message shown when no classes
    - Test class list renders in insertion order
    - _Requirements: 1.5, 1.6, 3.5, 5.1, 5.2_

- [ ] 15. Wire application together in `App.tsx`
  - [ ] 15.1 Update `src/App.tsx` to conditionally render `DashboardView` or `ClassDetailView`
    - Read `selectedClassId` from store; render `ClassDetailView` when non-null, otherwise `DashboardView`
    - Render persistence error toast (auto-dismiss after 5 seconds) when `persistenceError` is set
    - Render corrupted-data recovery banner (persistent until dismissed) when applicable
    - _Requirements: 4.2, 4.4, 5.1, 5.3, 5.4_

  - [ ]* 15.2 Write integration test: full add-class → add-assignment → sort flow
    - Mock `GeminiService.prioritize` to return a valid `PriorityResult[]`
    - Add a class, add two assignments (one complete, one incomplete), trigger sort
    - Assert priority list renders with the incomplete assignment and its explanation
    - _Requirements: 1.1, 2.1, 3.1, 3.2_

  - [ ]* 15.3 Write integration test: localStorage persistence across simulated reload
    - Add class and assignment, simulate page reload by clearing module cache and re-initializing store
    - Assert class and assignment are restored from localStorage
    - _Requirements: 4.1, 4.3_

  - [ ]* 15.4 Write integration test: corrupted localStorage recovery
    - Write partially corrupted data to localStorage, initialize app
    - Assert valid entries are restored and recovery notification is shown
    - _Requirements: 4.4_

- [ ] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `fast-check` and run a minimum of 100 iterations each; tag format: `Feature: husky-planner, Property {N}: {property_text}`
- Unit tests use Vitest + React Testing Library
- The `priorityList`, `sortState`, and `persistenceError` fields are ephemeral and are NOT persisted to localStorage
- The Gemini API key is read from `VITE_GEMINI_API_KEY` environment variable

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "9.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2", "4.1"] },
    { "id": 2, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.1", "9.2"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4", "7.1"] },
    { "id": 5, "tasks": ["10.1", "11.1", "12.1"] },
    { "id": 6, "tasks": ["10.2", "11.2", "12.2", "13.1"] },
    { "id": 7, "tasks": ["13.2", "13.3", "13.4", "14.1"] },
    { "id": 8, "tasks": ["14.2", "15.1"] },
    { "id": 9, "tasks": ["15.2", "15.3", "15.4"] }
  ]
}
```
