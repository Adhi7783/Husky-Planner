import { describe, it, expect } from 'vitest';
import { validateClassName, validateAssignmentFields } from './validation';
import type { Class } from '../types';

const mockClass = (name: string): Class => ({
  id: '1',
  name,
  createdAt: 0,
  difficulty: 1,
});

describe('validateClassName', () => {
  it('rejects empty string', () => {
    expect(validateClassName('', [])).not.toBeNull();
  });

  it('rejects whitespace-only', () => {
    expect(validateClassName('   ', [])).not.toBeNull();
  });

  it('rejects case-insensitive duplicate', () => {
    expect(validateClassName('CSE 142', [mockClass('cse 142')])).not.toBeNull();
  });

  it('accepts unique name', () => {
    expect(validateClassName('CSE 143', [mockClass('CSE 142')])).toBeNull();
  });
});

describe('validateAssignmentFields', () => {
  it('rejects empty name', () => {
    expect(validateAssignmentFields('', '2025-06-01').name).toBeDefined();
  });

  it('rejects invalid date', () => {
    expect(validateAssignmentFields('HW1', 'not-a-date').dueDate).toBeDefined();
  });

  it('accepts valid inputs', () => {
    expect(validateAssignmentFields('HW1', '2025-06-01')).toEqual({});
  });
});
