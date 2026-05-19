export interface Class {
  id: string;           // UUID v4
  name: string;         // trimmed, non-empty
  createdAt: number;    // Date.now() at creation
}

export interface Assignment {
  id: string;           // UUID v4
  classId: string;      // foreign key → Class.id
  name: string;         // trimmed, non-empty
  dueDate: string;      // ISO 8601 date string (YYYY-MM-DD)
  description?: string; // optional, stored as-is
  completed: boolean;
  createdAt: number;    // Date.now() at creation
}

export interface PriorityItem {
  assignmentId: string;
  rank: number;
  explanation: string;
}

export interface PlannerState {
  classes: Class[];
  assignments: Assignment[];
  selectedClassId: string | null;
  priorityList: PriorityItem[];
  sortState: 'idle' | 'loading' | 'error';
  sortError: string | null;
  persistenceError: string | null;
}

export interface AssignmentPayload {
  id: string;
  name: string;
  dueDate: string;       // ISO 8601 date string
  className: string;
  description?: string;
}

export interface PriorityResult {
  assignmentId: string;
  explanation: string;   // must reference at least one concrete factor
}

export interface NewAssignment {
  name: string;
  dueDate: string;
  description?: string;
}
