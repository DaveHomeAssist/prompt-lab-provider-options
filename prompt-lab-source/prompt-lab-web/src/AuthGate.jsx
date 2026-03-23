import { SignIn, SignUp, UserButton, useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

const SIGN_IN_HASH = '#sign-in';
const SIGN_UP_HASH = '#sign-up';

function viewFromHash(hash = '') {
  return hash === SIGN_UP_HASH ? 'sign-up' : 'sign-in';
}

function syncHashToView(nextView) {
  if (typeof window === 'undefined') return;
  const nextHash = nextView === 'sign-up' ? SIGN_UP_HASH : SIGN_IN_HASH;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, '', nextHash);
  }
}

/**
 * Auth gate for the hosted web app.
 * Shows sign-in/sign-up when not authenticated.
 * Renders children (the main app) when authenticated.
 * Falls back to rendering children directly if Clerk is not configured.
 */
export default function AuthGate({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [authView, setAuthView] = useState(() => (
    typeof window === 'undefined' ? 'sign-in' : viewFromHash(window.location.hash)
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncFromLocation = () => {
      const nextView = viewFromHash(window.location.hash);
      syncHashToView(nextView);
      setAuthView(nextView);
    };

    syncFromLocation();
    window.addEventListener('hashchange', syncFromLocation);
    return () => window.removeEventListener('hashchange', syncFromLocation);
  }, []);

  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', backgroundColor: '#020617', color: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (isSignedIn) {
    return children;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '1.5rem',
      backgroundColor: '#020617', padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <h1 style={{
          color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 700,
          fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0,
        }}>
          Prompt Lab
        </h1>
        <p style={{
          color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          Sign in to access your workbench
        </p>
      </div>

      {authView === 'sign-in' ? (
        <SignIn
          routing="hash"
          afterSignInUrl="/app/"
          signUpUrl={SIGN_UP_HASH}
          appearance={{ elements: { rootBox: { width: '100%', maxWidth: '400px' } } }}
        />
      ) : (
        <SignUp
          routing="hash"
          afterSignUpUrl="/app/"
          signInUrl={SIGN_IN_HASH}
          appearance={{ elements: { rootBox: { width: '100%', maxWidth: '400px' } } }}
        />
      )}

      <button
        type="button"
        onClick={() => {
          const nextView = authView === 'sign-in' ? 'sign-up' : 'sign-in';
          syncHashToView(nextView);
          setAuthView(nextView);
        }}
        style={{
          background: 'none', border: 'none', color: '#7c3aed',
          fontSize: '0.8125rem', cursor: 'pointer', padding: '0.5rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {authView === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}

/**
 * UserButton wrapper for the app header.
 * Only renders when Clerk is configured and user is signed in.
 */
export function WebUserButton() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;

  return (
    <UserButton
      afterSignOutUrl="/app/"
      appearance={{
        elements: {
          avatarBox: { width: '28px', height: '28px' },
        },
      }}
    />
  );
}
