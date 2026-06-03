import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from './storageService';

const storageMock = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem(key: string) {
      return storageMock.has(key) ? storageMock.get(key)! : null;
    },
    setItem(key: string, value: string) {
      storageMock.set(key, value);
    },
    removeItem(key: string) {
      storageMock.delete(key);
    },
    clear() {
      storageMock.clear();
    },
  },
  writable: true,
});

beforeEach(() => localStorage.clear());

describe('storageService', () => {
  it('returns null when nothing saved', () => {
    expect(storageService.load('user1')).toBeNull();
  });

  it('round-trips a save/load', () => {
    const state = {
      classes: [{ id: 'c1', name: 'Math', createdAt: 0 }],
      assignments: [],
      selectedClassId: null,
      priorityList: [],
      sortState: 'idle' as const,
      sortError: null,
      persistenceError: null,
      activeUserId: 'user1',
    };

    storageService.save(state, 'user1');
    const loaded = storageService.load('user1');
    expect(loaded?.classes[0].name).toBe('Math');
  });

  it('isolates data between users', () => {
    const state = {
      classes: [{ id: 'c1', name: 'Math', createdAt: 0 }],
      assignments: [],
      selectedClassId: null,
      priorityList: [],
      sortState: 'idle' as const,
      sortError: null,
      persistenceError: null,
      activeUserId: 'user1',
    };

    storageService.save(state, 'user1');
    expect(storageService.load('user2')).toBeNull();
  });
});
