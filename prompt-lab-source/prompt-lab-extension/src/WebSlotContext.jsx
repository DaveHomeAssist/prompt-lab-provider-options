import { createContext, useContext } from 'react';

/**
 * Context for web-shell-specific UI slots.
 * The web entry point provides components; extension/desktop leave them null.
 * This avoids importing web-only dependencies (Clerk) in the shared core.
 */
const WebSlotContext = createContext({
  UserButton: null,
});

export const WebSlotProvider = WebSlotContext.Provider;

export function useWebSlot() {
  return useContext(WebSlotContext);
}
