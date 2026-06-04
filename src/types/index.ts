export interface Class {
  id: string;
  name: string;
  createdAt: number;
  difficulty: number; // 1–5 scale
}
 
export interface Assignment {
  id: string;
  classId: string;
  name: string;
  dueDate: string;
  description?: string;
  explanation?: string;
  completed: boolean;
  createdAt: number;
  weight?: number;       // percentage 0–100
  difficulty?: number;  // 1–5 override for this specific assignment
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
  activeUserId: string;
}
 
export interface AssignmentPayload {
  id: string;
  name: string;
  dueDate: string;
  className: string;
  description?: string;
  weight?: number;
  difficulty?: number;
  classDifficulty?: number;
}
 
export interface PriorityResult {
  assignmentId: string;
  explanation: string;
}
 
export interface NewAssignment {
  name: string;
  dueDate: string;
  description?: string;
  weight?: number;
  difficulty?: number;
}