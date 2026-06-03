import { useCallback, useEffect, useState } from 'react';
import { usePlannerStore, hydratePlannerStore } from './store/plannerStore';
import { DashboardView } from './components/DashboardView';
import { ClassDetailView } from './components/ClassDetailView';
import { AuthGate, type PlannerUser } from './components/AuthGate';

const AUTH_STORAGE_KEY = 'huskyPlanner_user_v1';

/**
 * App
 *
 * Root component that wires the application together.
 *
 * Rendering rules:
 * - Renders `ClassDetailView` when `selectedClassId` is non-null.
 * - Renders `DashboardView` otherwise.
 * - When `persistenceError` is set and contains "could not be loaded":
 *   renders a persistent dismissible banner (corrupted-data recovery).
 * - When `persistenceError` is set for any other reason:
 *   renders a non-blocking toast that auto-dismisses after 5 seconds.
 *
 * Requirements: 4.2, 4.4, 5.1, 5.3, 5.4
 */
function App() {
  const [user, setUser] = useState<PlannerUser | null>(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw === null) return null;

    try {
      const u = JSON.parse(raw) as PlannerUser;
      hydratePlannerStore(u.subject);
      return u;
    } catch {
      return null;
    }
  });

  const classCount = usePlannerStore((state) => state.classes.length);
  const assignmentCount = usePlannerStore((state) => state.assignments.length);
  const selectedClassId = usePlannerStore((state) => state.selectedClassId);
  const persistenceError = usePlannerStore((state) => state.persistenceError);

  const isCorruptionError =
    persistenceError !== null && persistenceError.includes('could not be loaded');

  // Auto-dismiss toast after 5 seconds for non-corruption persistence errors
  useEffect(() => {
    if (persistenceError === null || isCorruptionError) return;

    const timerId = setTimeout(() => {
      usePlannerStore.setState({ persistenceError: null });
    }, 5000);

    return () => clearTimeout(timerId);
  }, [persistenceError, isCorruptionError]);

  const dismissBanner = () => {
    usePlannerStore.setState({ persistenceError: null });
  };

  const handleAuth = useCallback((nextUser: PlannerUser) => {
    setUser(nextUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    hydratePlannerStore(nextUser.subject);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  if (user === null) {
    return <AuthGate onAuthenticated={handleAuth} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">UW student planner</p>
          <h1>Husky Planner</h1>
          <p className="header-copy">
            A cleaner place to track classes, assignments, and AI priority sorting.
          </p>
          <div className="stats-row" aria-label="Planner summary">
            <span>{classCount} classes</span>
            <span>{assignmentCount} assignments</span>
          </div>
        </div>

        <div className="user-chip" aria-label="Signed in account">
          {user.picture ? <img src={user.picture} alt="" /> : <span>{user.name.slice(0, 1)}</span>}
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button type="button" onClick={handleLogout} className="ghost-button">
            Log out
          </button>
        </div>
      </header>

      <main className="app-content">
        {isCorruptionError && (
          <div role="alert" aria-live="assertive" className="banner banner-warning">
            <span>{persistenceError}</span>
            <button type="button" onClick={dismissBanner} className="banner-button">
              Dismiss
            </button>
          </div>
        )}

        <section className="hero-card">
          <div>
            <p className="eyebrow">Today&apos;s focus</p>
            <h2>Keep assignments visible and work in priority order.</h2>
          </div>
          <div className="hero-stats">
            <div>
              <strong>{usePlannerStore.getState().classes.length}</strong>
              <span>Classes tracked</span>
            </div>
            <div>
              <strong>{usePlannerStore.getState().assignments.length}</strong>
              <span>Total assignments</span>
            </div>
          </div>
        </section>

        {selectedClassId !== null ? <ClassDetailView /> : <DashboardView />}
      </main>

      {persistenceError !== null && !isCorruptionError && (
        <div role="alert" aria-live="polite" className="toast">
          {persistenceError}
        </div>
      )}
    </div>
  );
}

export default App;
