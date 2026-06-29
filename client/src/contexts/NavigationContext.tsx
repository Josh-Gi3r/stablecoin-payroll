import { createContext, useContext } from 'react';

interface NavigationContextValue {
  navigateTo: (moduleId: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export const NavigationProvider = NavigationContext.Provider;

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    return { navigateTo: () => {} };
  }
  return ctx;
}
