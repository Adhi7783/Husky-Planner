import { useEffect } from 'react';
import { usePlannerStore } from './store/plannerStore';
import { DashboardView } from './components/DashboardView';
import { ClassDetailView } from './components/ClassDetailView';

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

  return (
    <>
      {/* Corrupted-data recovery banner — persistent until dismissed */}
      {isCorruptionError && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            padding: '12px 16px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{persistenceError}</span>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss recovery notification"
            style={{ marginLeft: '16px', cursor: 'pointer' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main view — ClassDetailView when a class is selected, DashboardView otherwise */}
      {selectedClassId !== null ? <ClassDetailView /> : <DashboardView />}

      {/* Non-blocking toast for transient persistence errors (auto-dismisses after 5 s) */}
      {persistenceError !== null && !isCorruptionError && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c2c7',
            borderRadius: '4px',
            padding: '12px 16px',
            maxWidth: '360px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {persistenceError}
        </div>
      )}
    </>
  );
}

export default App;
