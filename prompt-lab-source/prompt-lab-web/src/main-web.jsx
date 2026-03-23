import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from '../../prompt-lab-extension/src/App';
import ErrorBoundary from '../../prompt-lab-extension/src/ErrorBoundary';
import { WebSlotProvider } from '../../prompt-lab-extension/src/WebSlotContext';
import AuthGate, { WebUserButton } from './AuthGate';
import { EntitlementProvider } from './useEntitlements';
import '../../prompt-lab-extension/src/index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const PRODUCTION_AUTH_HOSTS = new Set(['promptlab.tools', 'www.promptlab.tools']);

const clerkAppearance = {
  baseTheme: undefined,
  variables: {
    colorPrimary: '#7c3aed',
    colorBackground: '#0f172a',
    colorText: '#e2e8f0',
    colorInputBackground: '#1e293b',
    colorInputText: '#e2e8f0',
    borderRadius: '0.5rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  elements: {
    card: { backgroundColor: '#0f172a', border: '1px solid #334155' },
    headerTitle: { color: '#e2e8f0' },
    headerSubtitle: { color: '#94a3b8' },
    socialButtonsBlockButton: { border: '1px solid #334155' },
    formButtonPrimary: { backgroundColor: '#7c3aed', '&:hover': { backgroundColor: '#6d28d9' } },
    footerActionLink: { color: '#7c3aed' },
  },
};

function WebRoot() {
  if (!CLERK_PUBLISHABLE_KEY) {
    const isProductionHostedWeb = typeof window !== 'undefined'
      && PRODUCTION_AUTH_HOSTS.has(window.location.hostname);

    if (isProductionHostedWeb) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          backgroundColor: '#020617',
          color: '#cbd5e1',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            maxWidth: '34rem',
            border: '1px solid #334155',
            borderRadius: '1rem',
            backgroundColor: '#0f172a',
            padding: '1.5rem',
          }}>
            <h1 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#f8fafc' }}>
              Prompt Lab auth is not configured
            </h1>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              The hosted web app expects <code>VITE_CLERK_PUBLISHABLE_KEY</code> to be set.
              Production now blocks open access when that key is missing so the app does not
              silently fall back into an unauthenticated state.
            </p>
          </div>
        </div>
      );
    }

    console.warn('[prompt-lab] Clerk is not configured; rendering the hosted app without auth for local or preview use.');
    return (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
    >
      <ErrorBoundary>
        <AuthGate>
          <EntitlementProvider>
            <WebSlotProvider value={{ UserButton: WebUserButton }}>
              <App />
            </WebSlotProvider>
          </EntitlementProvider>
        </AuthGate>
      </ErrorBoundary>
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<WebRoot />);
