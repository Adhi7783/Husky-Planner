import { isValid, parseISO } from 'date-fns';
import type { Class } from '../types';

/**
 * Validates a class name against existing classes.
 *
 * @param name - The proposed class name.
 * @param existingClasses - The current list of classes.
 * @returns An error string if invalid, or `null` if valid.
 *
 * Requirements: 1.2, 1.3
 */
export function validateClassName(name: string, existingClasses: Class[]): string | null {
  if (name.trim().length === 0) {
    return 'Class name cannot be empty.';
  }

  const trimmed = name.trim().toLowerCase();
  const isDuplicate = existingClasses.some(
    (cls) => cls.name.trim().toLowerCase() === trimmed
  );

  if (isDuplicate) {
    return 'A class with this name already exists.';
  }

  return null;
}

/**
 * Validates assignment form fields.
 *
 * @param name - The assignment name.
 * @param dueDate - The due date string (expected ISO 8601 format, e.g. YYYY-MM-DD).
 * @returns A map of field name → error message for each invalid field.
 *          Returns an empty object `{}` if all fields are valid.
 *
 * Requirements: 2.2, 2.3, 5.5
 */
export function validateAssignmentFields(
  name: string,
  dueDate: string
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (name.trim().length === 0) {
    errors['name'] = 'Assignment name cannot be empty.';
  }

  if (!dueDate || !isValid(parseISO(dueDate))) {
    errors['dueDate'] = 'A valid due date is required (YYYY-MM-DD).';
  }

  return errors;
}
