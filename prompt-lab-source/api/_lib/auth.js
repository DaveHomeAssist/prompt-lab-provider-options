import { createClerkClient } from '@clerk/backend';
import {
  getAuthorizedParties,
  getBaseUrl,
  isAllowedOrigin,
  json,
} from './http.js';

function getClerkConfig() {
  return {
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
  };
}

function getMissingClerkEnv(config) {
  if (!config.secretKey) {
    return 'CLERK_SECRET_KEY';
  }

  if (!config.publishableKey) {
    return 'CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY';
  }

  return null;
}

function getClerkClient() {
  const config = getClerkConfig();
  return createClerkClient({
    secretKey: config.secretKey,
    publishableKey: config.publishableKey,
  });
}

function getPrimaryEmail(user) {
  if (!user || !Array.isArray(user.emailAddresses) || user.emailAddresses.length === 0) {
    return null;
  }

  const primary = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId);
  return primary?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
}

function getDisplayName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || user?.fullName || user?.username || null;
}

export async function requireAuthenticatedUser(request) {
  const origin = request.headers.get('origin') || '';

  if (!isAllowedOrigin(origin, request)) {
    return {
      errorResponse: json({ error: 'Origin not allowed.' }, 403, origin, request),
    };
  }

  const clerkConfig = getClerkConfig();
  const missing = getMissingClerkEnv(clerkConfig);
  if (missing) {
    return {
      errorResponse: json(
        { error: `Billing auth is not configured. Missing ${missing}.` },
        503,
        origin,
        request,
      ),
    };
  }

  const clerkClient = getClerkClient();
  const requestState = await clerkClient.authenticateRequest(request, {
    authorizedParties: getAuthorizedParties(request),
  });

  if (!requestState.isAuthenticated) {
    return {
      errorResponse: json(
        {
          error: 'Authentication required.',
          reason: requestState.reason || null,
        },
        401,
        origin,
        request,
      ),
    };
  }

  const auth = requestState.toAuth();
  if (!auth?.userId) {
    return {
      errorResponse: json({ error: 'Signed-in user could not be resolved.' }, 401, origin, request),
    };
  }

  const user = await clerkClient.users.getUser(auth.userId);

  return {
    origin,
    baseUrl: getBaseUrl(request),
    user: {
      id: auth.userId,
      email: getPrimaryEmail(user),
      displayName: getDisplayName(user),
    },
  };
}
