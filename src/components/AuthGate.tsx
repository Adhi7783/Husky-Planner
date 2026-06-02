import { useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: GoogleInitializeOptions): void;
      renderButton(element: HTMLElement, options: GoogleButtonOptions): void;
      disableAutoSelect(): void;
    };
  };
}

interface GoogleInitializeOptions {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleButtonOptions {
  theme: 'outline' | 'filled_blue' | 'filled_black';
  size: 'large' | 'medium' | 'small';
  shape: 'rectangular' | 'pill' | 'circle' | 'square';
  text: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  logo_alignment: 'left' | 'center';
  width?: string;
}

interface GoogleCredentialResponse {
  credential?: string;
}

export interface PlannerUser {
  name: string;
  email: string;
  picture?: string;
  subject: string;
}

interface AuthGateProps {
  onAuthenticated(user: PlannerUser): void;
}

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_GLOBAL_TIMEOUT_MS = 5000;

function waitForGoogleIdentity(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(start);
        window.clearTimeout(timeout);
        resolve();
      }
    }, 50);

    const timeout = window.setTimeout(() => {
      window.clearInterval(start);
      reject(new Error('Google Identity Services loaded, but the google.accounts.id API was not available.'));
    }, timeoutMs);
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  try {
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      void waitForGoogleIdentity(GOOGLE_GLOBAL_TIMEOUT_MS).then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      void waitForGoogleIdentity(GOOGLE_GLOBAL_TIMEOUT_MS).then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error('Google sign-in failed to load.'));
    document.head.appendChild(script);
  });
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing-client-id' | 'error'>(
    'loading'
  );
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const clientId = envClientId;

  const instruction = useMemo(() => {
    if (status === 'missing-client-id') {
      return 'Google login is not configured yet. Add VITE_GOOGLE_CLIENT_ID to enable sign in.';
    }

    if (status === 'error') {
      return (
        errorDetails ??
        `Google sign-in could not be initialized. Check that your OAuth client allows ${window.location.origin} as an authorized JavaScript origin.`
      );
    }

    return 'Sign in with Google to keep your planner data separate on this device.';
  }, [status, errorDetails]);

  useEffect(() => {
    if (!clientId) {
      setStatus('missing-client-id');
      setErrorDetails(null);
      return;
    }

    let cancelled = false;
    const buttonElement = buttonRef.current;

    if (!buttonElement) {
      setErrorDetails('Google sign-in could not find the button container. Please refresh the page.');
      setStatus('error');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setErrorDetails('Google sign-in timed out while initializing. Check browser privacy settings, extensions, and network access to accounts.google.com.');
        setStatus('error');
      }
    }, 8000);

    void loadGoogleScript()
      .then(() => {
        if (cancelled) return;

        if (!buttonElement || !window.google) {
          setErrorDetails('Google sign-in script loaded, but the Google API object was not available. Check that the script was not blocked by the browser or an extension.');
          setStatus('error');
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response.credential) return;

            const payload = decodeJwtPayload(response.credential);
            if (!payload) return;

            const name = typeof payload.name === 'string' ? payload.name : 'Google user';
            const email = typeof payload.email === 'string' ? payload.email : 'Signed-in account';
            const picture = typeof payload.picture === 'string' ? payload.picture : undefined;
            const subject = typeof payload.sub === 'string' ? payload.sub : email;

            onAuthenticated({ name, email, picture, subject });
          },
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        buttonElement.replaceChildren();
        window.google.accounts.id.renderButton(buttonElement, {
          theme: 'filled_blue',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
        });

        setStatus('ready');
        setErrorDetails(null);
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Google sign-in failed to load.';
          setErrorDetails(message);
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);

      if (buttonElement.isConnected) {
        buttonElement.replaceChildren();
      }
    };
  }, [clientId, onAuthenticated]);

  const fallbackUser: PlannerUser = {
    name: 'Guest Planner',
    email: 'guest@localhost',
    subject: 'guest',
  };

  const canUseFallback = status === 'missing-client-id' || status === 'error';

  function handleContinueWithoutGoogle() {
    onAuthenticated(fallbackUser);
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <p className="eyebrow">Husky Planner</p>
        <h1>Plan faster. Worry less. Stay on top of your coursework.</h1>
        <p>
          Track classes, sort assignments by priority, and keep the whole workload in one place.
        </p>

        <div className="feature-grid">
          <article>
            <strong>Clean overview</strong>
            <span>Assignments stay grouped by class and due date.</span>
          </article>
          <article>
            <strong>AI prioritization</strong>
            <span>Groq helps rank what to work on first.</span>
          </article>
          <article>
            <strong>Persistent data</strong>
            <span>Your planner survives refreshes on this device.</span>
          </article>
        </div>
      </section>

      <section className="auth-card" aria-label="Google sign in">
        <h2>Sign in with Google</h2>
        <p>{instruction}</p>

        {status === 'loading' && <div className="button-placeholder">Loading sign-in…</div>}
        <div ref={buttonRef} className="google-button-slot" aria-busy={status === 'loading'} />

        {canUseFallback && (
          <>
            <button type="button" className="secondary-button" onClick={handleContinueWithoutGoogle}>
              Continue without Google
            </button>
            <div className="auth-note">
              You can still use the planner locally without Google sign-in configured.
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default AuthGate;