import { SignIn, SignUp, UserButton, useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import useCurrentUser from './useCurrentUser.js';
import useEntitlements from './useEntitlements.jsx';

const SIGN_IN_HASH = '#sign-in';
const SIGN_UP_HASH = '#sign-up';

const AUTH_PAGE_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top, rgba(124, 58, 237, 0.22), transparent 30%), radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.12), transparent 28%), #020617',
  padding: 'clamp(1.5rem, 4vw, 3rem)',
};

const AUTH_STAGE_STYLE = {
  width: '100%',
  maxWidth: '1100px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 'clamp(1.5rem, 4vw, 3rem)',
  alignItems: 'center',
};

const AUTH_INFO_CARD_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  padding: 'clamp(1.5rem, 3vw, 2.25rem)',
  borderRadius: '1.5rem',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background:
    'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.78))',
  boxShadow: '0 30px 80px rgba(2, 6, 23, 0.55)',
  backdropFilter: 'blur(16px)',
};

const AUTH_KICKER_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  width: 'fit-content',
  padding: '0.35rem 0.7rem',
  borderRadius: '999px',
  border: '1px solid rgba(167, 139, 250, 0.35)',
  background: 'rgba(124, 58, 237, 0.14)',
  color: '#c4b5fd',
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const AUTH_TITLE_STYLE = {
  color: '#f8fafc',
  fontSize: 'clamp(2rem, 5vw, 3.4rem)',
  lineHeight: 1.04,
  fontWeight: 800,
  letterSpacing: '-0.04em',
  margin: 0,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const AUTH_SUBTITLE_STYLE = {
  color: '#94a3b8',
  fontSize: '1rem',
  lineHeight: 1.7,
  margin: 0,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const AUTH_POINTS_STYLE = {
  display: 'grid',
  gap: '0.875rem',
};

const AUTH_POINT_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: '0.75rem',
  alignItems: 'flex-start',
  color: '#cbd5e1',
  fontSize: '0.95rem',
  lineHeight: 1.55,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const AUTH_POINT_MARK_STYLE = {
  width: '1.65rem',
  height: '1.65rem',
  borderRadius: '999px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(124, 58, 237, 0.16)',
  border: '1px solid rgba(167, 139, 250, 0.22)',
  color: '#ddd6fe',
  fontSize: '0.85rem',
  fontWeight: 700,
  flexShrink: 0,
};

const AUTH_FORM_WRAP_STYLE = {
  display: 'flex',
  justifyContent: 'center',
};

const AUTH_FORM_CARD_STYLE = {
  width: '100%',
  maxWidth: '440px',
  display: 'grid',
  gap: '1rem',
};

const AUTH_NOTE_STYLE = {
  margin: 0,
  color: '#94a3b8',
  fontSize: '0.82rem',
  lineHeight: 1.55,
  textAlign: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const AUTH_BACK_LINK_STYLE = {
  width: 'fit-content',
  background: 'none',
  border: 'none',
  color: '#cbd5e1',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

export const clerkAppearance = {
  baseTheme: undefined,
  variables: {
    colorPrimary: '#7c3aed',
    colorBackground: '#10182c',
    colorText: '#e2e8f0',
    colorInputBackground: '#1f2937',
    colorInputText: '#e2e8f0',
    colorTextSecondary: '#94a3b8',
    colorNeutral: '#334155',
    borderRadius: '0.9rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  elements: {
    cardBox: { width: '100%', boxShadow: '0 28px 70px rgba(2, 6, 23, 0.55)' },
    card: {
      backgroundColor: 'rgba(15, 23, 42, 0.96)',
      border: '1px solid rgba(71, 85, 105, 0.75)',
      borderRadius: '1.35rem',
      boxShadow: 'none',
    },
    headerTitle: { color: '#f8fafc', fontSize: '1.65rem', fontWeight: 800 },
    headerSubtitle: { color: '#94a3b8' },
    socialButtonsBlockButton: {
      border: '1px solid rgba(71, 85, 105, 0.75)',
      backgroundColor: 'rgba(15, 23, 42, 0.56)',
    },
    formFieldInput: {
      backgroundColor: '#1f2937',
      borderColor: 'rgba(71, 85, 105, 0.75)',
      color: '#f8fafc',
    },
    formFieldLabel: { color: '#cbd5e1', fontWeight: 600 },
    dividerLine: { backgroundColor: 'rgba(71, 85, 105, 0.75)' },
    dividerText: { color: '#94a3b8' },
    formButtonPrimary: {
      background:
        'linear-gradient(90deg, rgba(124,58,237,1) 0%, rgba(168,85,247,1) 100%)',
      '&:hover': { background: 'linear-gradient(90deg, rgba(109,40,217,1) 0%, rgba(147,51,234,1) 100%)' },
    },
    footerActionLink: { color: '#7c3aed' },
    footerActionText: { color: '#94a3b8' },
    rootBox: { width: '100%', maxWidth: '440px' },
    avatarBox: { width: '28px', height: '28px' },
  },
};

function viewFromHash(hash = '') {
  return hash === SIGN_UP_HASH ? 'sign-up' : 'sign-in';
}

function isAuthHash(hash = '') {
  return hash === SIGN_IN_HASH || hash === SIGN_UP_HASH;
}

function syncHashToView(nextView) {
  if (typeof window === 'undefined') return;
  const nextHash = nextView === 'sign-up' ? SIGN_UP_HASH : SIGN_IN_HASH;
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}

function clearAuthHash() {
  if (typeof window === 'undefined') return;
  if (!window.location.hash) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

/**
 * Hosted-web auth shell.
 * The shared app always stays available for BYOK usage.
 * Clerk only controls dedicated auth screens and premium account state.
 */
export default function AuthGate({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  const currentUser = useCurrentUser();
  const [authView, setAuthView] = useState(() => (
    typeof window === 'undefined' ? 'sign-in' : viewFromHash(window.location.hash)
  ));
  const [showAuthScreen, setShowAuthScreen] = useState(() => (
    typeof window !== 'undefined' && isAuthHash(window.location.hash)
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncFromLocation = () => {
      setAuthView(viewFromHash(window.location.hash));
      setShowAuthScreen(isAuthHash(window.location.hash));
    };

    syncFromLocation();
    window.addEventListener('hashchange', syncFromLocation);
    return () => window.removeEventListener('hashchange', syncFromLocation);
  }, []);

  useEffect(() => {
    if (isSignedIn && showAuthScreen) {
      clearAuthHash();
      setShowAuthScreen(false);
    }
  }, [isSignedIn, showAuthScreen]);

  if (!isLoaded && showAuthScreen) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#020617',
        color: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!showAuthScreen) return children;

  return (
    <div style={AUTH_PAGE_STYLE}>
      <div style={AUTH_STAGE_STYLE}>
        <section style={AUTH_INFO_CARD_STYLE}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={AUTH_KICKER_STYLE}>
              {authView === 'sign-up' ? 'Create Account' : 'Prompt Lab Account'}
            </div>
            <h1 style={AUTH_TITLE_STYLE}>
              {authView === 'sign-up'
                ? 'Create an account for plan state and premium access.'
                : 'Sign in when you want account features. Keep editing either way.'}
            </h1>
            <p style={AUTH_SUBTITLE_STYLE}>
              {currentUser.isSignedIn
                ? 'Your account is active. Use the app header to manage your session and plan state.'
                : 'Prompt Lab stays BYOK-first. Signing in adds account state, plan access, and billing context without turning model calls into a hosted-credits product.'}
            </p>
          </div>

          <div style={AUTH_POINTS_STYLE}>
            <div style={AUTH_POINT_STYLE}>
              <span style={AUTH_POINT_MARK_STYLE}>1</span>
              <span>Your provider keys stay in local Prompt Lab settings. Account auth does not replace BYOK editing.</span>
            </div>
            <div style={AUTH_POINT_STYLE}>
              <span style={AUTH_POINT_MARK_STYLE}>2</span>
              <span>Signing in is for premium workspace limits, plan state, billing, and recovery paths that should belong to you instead of the browser alone.</span>
            </div>
            <div style={AUTH_POINT_STYLE}>
              <span style={AUTH_POINT_MARK_STYLE}>3</span>
              <span>You can go back to the editor at any time and continue working without an account.</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              clearAuthHash();
              setShowAuthScreen(false);
            }}
            style={AUTH_BACK_LINK_STYLE}
          >
            Back to Prompt Lab
          </button>
        </section>

        <section style={AUTH_FORM_WRAP_STYLE}>
          <div style={AUTH_FORM_CARD_STYLE}>
            {authView === 'sign-in' ? (
              <SignIn
                routing="hash"
                afterSignInUrl="/app/"
                signUpUrl={SIGN_UP_HASH}
                appearance={clerkAppearance}
              />
            ) : (
              <SignUp
                routing="hash"
                afterSignUpUrl="/app/"
                signInUrl={SIGN_IN_HASH}
                appearance={clerkAppearance}
              />
            )}

            <p style={AUTH_NOTE_STYLE}>
              BYOK editing remains available signed out. This screen is only for account-linked features.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Hosted-web account slot for the shared app header.
 * Signed-out users get a sign-in button; signed-in users get plan state plus
 * the Clerk user menu.
 */
export function WebUserButton() {
  const currentUser = useCurrentUser();
  const { plan, isLoaded: entitlementsLoaded } = useEntitlements();

  if (!currentUser.isSignedIn) {
    return (
      <button
        type="button"
        onClick={() => syncHashToView('sign-in')}
        className="ui-control rounded-lg border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-200 transition-colors hover:border-violet-300 hover:bg-violet-500/25"
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
        {entitlementsLoaded ? plan : '...'}
      </span>
      <UserButton
        afterSignOutUrl="/app/"
        appearance={clerkAppearance}
      />
    </div>
  );
}
