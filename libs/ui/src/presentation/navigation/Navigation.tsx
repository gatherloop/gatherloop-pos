import { createContext, ReactNode, useContext } from 'react';

// Router-agnostic navigation port for apps/order (D19 in
// docs/prd-table-ordering.md). apps/web has `solito/router`; the customer
// SPA has no Next/Expo/React Navigation runtime to wrap, so it supplies its
// own client router and feeds it into this context. Handlers depend only on
// `useNavigation()`, never on a router package, which is what keeps them
// testable exactly like the POS handlers that mock `solito/router`.
export type NavigationContextValue = {
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const NavigationContext = createContext<NavigationContextValue>({
  push: noop,
  replace: noop,
  back: noop,
});

export const useNavigation = () => useContext(NavigationContext);

export type NavigationProviderProps = {
  children: ReactNode;
  value: NavigationContextValue;
};

export const NavigationProvider = ({
  children,
  value,
}: NavigationProviderProps) => (
  <NavigationContext.Provider value={value}>
    {children}
  </NavigationContext.Provider>
);
