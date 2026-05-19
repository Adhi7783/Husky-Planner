# Requirements Document

## Introduction

Husky Planner is a web application that helps students manage their academic workload. Students can add their enrolled classes and the assignments belonging to each class. The application then uses the Gemini AI API to analyze all pending assignments and sort them by priority, helping students focus on what matters most.

## Glossary

- **Student**: The end user of the application who manages their academic schedule.
- **Class**: A course that a student is enrolled in (e.g., "CSS 382 - Software Engineering").
- **Assignment**: A task or deliverable associated with a specific class, including a name, due date, and optional description.
- **Priority**: A ranking of assignments determined by the Gemini AI based on due dates, estimated effort, and other factors.
- **Priority_List**: The ordered list of assignments returned by the Gemini AI after analysis.
- **Planner**: The Husky Planner web application system.
- **Gemini_API**: The Google Gemini AI service used to analyze and rank assignments.

---

## Requirements

### Requirement 1: Class Management

**User Story:** As a student, I want to add and manage my enrolled classes, so that I can organize my assignments by course.

#### Acceptance Criteria

1. WHEN a student submits a new class with a non-empty, non-whitespace-only name, THE Planner SHALL create the class with a unique identifier and display it in the student's class list within the same render cycle.
2. WHEN a student attempts to add a class with an empty name or a name consisting only of whitespace characters, THE Planner SHALL prevent the addition and display a validation error message adjacent to the name input field.
3. WHEN a student attempts to add a class whose name, after trimming leading and trailing whitespace, exactly matches the name of an existing class (case-insensitive), THE Planner SHALL prevent the addition and display a validation error message indicating the class name already exists.
4. WHEN a student deletes a class, THE Planner SHALL atomically remove the class and all of its associated assignments from the student's data; IF any part of the deletion fails, THEN THE Planner SHALL roll back the entire operation and preserve both the class and all of its assignments in their prior state.
5. THE Planner SHALL display all of the student's classes in a list on the main dashboard, ordered by the time they were added (oldest first).
6. WHEN a student has no classes, THE Planner SHALL display an empty-state message on the dashboard prompting the student to add their first class.

---

### Requirement 2: Assignment Management

**User Story:** As a student, I want to add assignments to my classes with due dates and descriptions, so that I can track all my academic tasks in one place.

#### Acceptance Criteria

1. WHEN a student submits a new assignment with a non-empty name and a valid due date for a specific class, THE Planner SHALL create the assignment, associate it with that class, and display it in the class's assignment list.
2. WHEN a student attempts to add an assignment with an empty name, THE Planner SHALL prevent the addition and display a validation error message adjacent to the name input field without clearing other field values.
3. WHEN a student attempts to add an assignment with a missing or invalid due date, THE Planner SHALL prevent the addition and display a validation error message adjacent to the due date input field without clearing other field values.
4. WHEN a student marks an assignment as complete, THE Planner SHALL update the assignment's status to "completed" and exclude it from all future Gemini_API priority sort requests.
5. WHEN a student marks a completed assignment as incomplete, THE Planner SHALL update the assignment's status to "incomplete" and include it in future Gemini_API priority sort requests.
6. WHEN a student deletes an assignment, THE Planner SHALL remove the assignment from its parent class and from any currently displayed Priority_List.
7. WHERE a student explicitly provides an optional description for an assignment, THE Planner SHALL store and display that description alongside the assignment's name, due date, and completion status.
8. THE Planner SHALL display all assignments for a selected class in a list ordered by due date ascending, showing each assignment's name, due date, completion status, and optional description.
9. WHEN a selected class has no assignments, THE Planner SHALL display an empty-state message prompting the student to add their first assignment.

---

### Requirement 3: AI-Powered Priority Sorting

**User Story:** As a student, I want Gemini AI to sort my pending assignments by priority, so that I know which tasks to focus on first.

#### Acceptance Criteria

1. WHEN a student requests priority sorting, THE Planner SHALL send all incomplete assignments — including each assignment's name, due date, parent class name, and description (if present) — to the Gemini_API in a single request.
2. WHEN the Gemini_API returns a valid prioritized response, THE Planner SHALL display the assignments in the returned priority order, with each assignment accompanied by an explanation that references at least one concrete prioritization factor (e.g., due date proximity, estimated effort, or dependencies).
3. IF the Planner fails to render the Priority_List after receiving a valid Gemini_API response, THEN THE Planner SHALL display an error message indicating that the results could not be displayed and prompt the student to try again.
4. WHEN the Gemini_API returns an HTTP error, times out, or returns a response that cannot be parsed into a valid Priority_List, THE Planner SHALL display an error message indicating the nature of the failure, preserve all existing class and assignment data unchanged, and re-enable the sort button.
5. WHILE a priority sort request is in progress, THE Planner SHALL display a loading indicator and disable the sort button to prevent duplicate requests.
6. WHEN a student requests priority sorting and all assignments are marked as complete or no assignments exist, THE Planner SHALL display a message informing the student there are no incomplete assignments to prioritize and SHALL NOT send a request to the Gemini_API.

---

### Requirement 4: Data Persistence

**User Story:** As a student, I want my classes and assignments to be saved between sessions, so that I do not have to re-enter my data every time I visit the site.

#### Acceptance Criteria

1. WHEN a student adds, updates, or deletes a class or assignment, THE Planner SHALL persist the change to local storage within 500 milliseconds of the operation completing.
2. IF a local storage write operation fails (e.g., due to quota exceeded or a security error), THEN THE Planner SHALL display a non-blocking notification informing the student that the change could not be saved, and SHALL retain the change in the in-memory application state for the current session.
3. WHEN a student opens or refreshes the application, THE Planner SHALL load and display all previously saved classes and assignments from local storage before rendering the main dashboard.
4. IF local storage data is corrupted or unreadable, THEN THE Planner SHALL parse and recover all valid, parseable entries as the restored state; IF no valid entries can be recovered, THEN THE Planner SHALL initialize with an empty state and display a notification informing the student that previous data could not be loaded.

---

### Requirement 5: User Interface and Navigation

**User Story:** As a student, I want a clear and intuitive interface, so that I can manage my planner efficiently without confusion.

#### Acceptance Criteria

1. THE Planner SHALL provide a main dashboard that displays the student's class list and a prominently labeled button to trigger AI priority sorting.
2. WHEN a student has no classes, THE Planner SHALL display an empty-state message on the dashboard and SHALL NOT display the AI priority sort button.
3. WHEN a student selects a class, THE Planner SHALL display a detail view showing the class name, all of its assignments (name, due date, completion status, and optional description), and controls to add or delete assignments.
4. WHEN a student navigates from a class detail view back to the dashboard, THE Planner SHALL preserve the previously selected class identifier so that re-selecting the same class restores the same detail view without data loss.
5. WHEN a student submits a form with invalid input, THE Planner SHALL display all validation error messages inline, adjacent to their respective input fields, and SHALL NOT clear the values of fields that passed validation.
