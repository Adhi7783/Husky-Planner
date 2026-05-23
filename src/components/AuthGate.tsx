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
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in failed to load.'));
    document.head.appendChild(script);
  });
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing-client-id' | 'error'>(
    'loading'
  );

  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const clientId = envClientId;

  const instruction = useMemo(() => {
    if (status === 'missing-client-id') {
      return 'Google login is not configured yet. Add VITE_GOOGLE_CLIENT_ID to enable sign in.';
    }

    if (status === 'error') {
      return 'Google sign-in could not be initialized. Check that your OAuth client allows http://localhost:5173 as an authorized JavaScript origin.';
    }

    return 'Sign in with Google to keep your planner data separate on this device.';
  }, [status]);

  useEffect(() => {
    if (!clientId) {
      setStatus('missing-client-id');
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setStatus('error');
      }
    }, 8000);

    void loadGoogleScript()
      .then(() => {
        if (cancelled) return;

        if (!buttonRef.current || !window.google) {
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

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_blue',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
        });

        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
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
            <span>Gemini helps rank what to work on first.</span>
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

        <div ref={buttonRef} className="google-button-slot">
          {status === 'loading' && <div className="button-placeholder">Loading sign-in…</div>}
        </div>

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