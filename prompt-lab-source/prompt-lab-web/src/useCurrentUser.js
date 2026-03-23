import { useUser } from '@clerk/clerk-react';

/**
 * Thin owned-shape wrapper around Clerk's useUser().
 * Returns a normalized shape so components never depend on Clerk internals.
 * If Clerk is unavailable (no provider, extension, desktop), returns signed-out defaults.
 */
export default function useCurrentUser() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user, isSignedIn, isLoaded } = useUser();

    if (!isLoaded) {
      return { id: null, email: null, displayName: null, isSignedIn: false, isLoaded: false };
    }

    if (!isSignedIn || !user) {
      return { id: null, email: null, displayName: null, isSignedIn: false, isLoaded: true };
    }

    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || null,
      displayName: user.fullName || user.firstName || user.username || null,
      isSignedIn: true,
      isLoaded: true,
    };
  } catch {
    // Outside ClerkProvider (extension, desktop) — return safe defaults
    return { id: null, email: null, displayName: null, isSignedIn: false, isLoaded: true };
  }
}
