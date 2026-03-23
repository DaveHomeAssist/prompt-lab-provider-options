import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from '../../prompt-lab-extension/src/App';
import ErrorBoundary from '../../prompt-lab-extension/src/ErrorBoundary';
import { WebSlotProvider } from '../../prompt-lab-extension/src/WebSlotContext';
import AuthGate, { WebUserButton, clerkAppearance } from './AuthGate';
import { EntitlementProvider } from './useEntitlements';
import '../../prompt-lab-extension/src/index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Web root — locked to the BYOK product model.
 * The app always renders, even when Clerk is absent. Auth only adds account
 * state and premium entitlements on top of the hosted workbench.
 */
function WebRoot() {
  if (!CLERK_PUBLISHABLE_KEY) {
    console.warn('[prompt-lab] Clerk is not configured; rendering the hosted BYOK app without account features.');
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
