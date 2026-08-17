import { ReactNode, useEffect, useMemo, useState } from 'react';
import { NavigationProvider } from '@gatherloop-pos/ui/order';
import { matchPath } from './matchPath';

// History-API router for the customer SPA (D19 in
// docs/prd-table-ordering.md). Vite's `base` config (production:
// '/gatherloop-pos/order/', local dev: '/') is exposed at runtime as
// `import.meta.env.BASE_URL`, so the basename below always matches
// wherever the app is actually mounted without a second source of truth.
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

const stripBasename = (pathname: string): string => {
  if (BASENAME && pathname.startsWith(BASENAME)) {
    const stripped = pathname.slice(BASENAME.length);
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }
  return pathname;
};

const toFullPath = (path: string): string =>
  `${BASENAME}${path.startsWith('/') ? path : `/${path}`}`;

export type RouteConfig = {
  path: string;
  element: (params: Record<string, string>) => ReactNode;
};

export type RouterProps = {
  routes: RouteConfig[];
  notFound: ReactNode;
};

export const Router = ({ routes, notFound }: RouterProps) => {
  const [pathname, setPathname] = useState(() =>
    stripBasename(window.location.pathname)
  );

  useEffect(() => {
    const onPopState = () => setPathname(stripBasename(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const push = (path: string) => {
    window.history.pushState({}, '', toFullPath(path));
    setPathname(path.startsWith('/') ? path : `/${path}`);
  };

  const replace = (path: string) => {
    window.history.replaceState({}, '', toFullPath(path));
    setPathname(path.startsWith('/') ? path : `/${path}`);
  };

  // Browser back fires its own `popstate`, which the listener above already
  // handles — no need to touch `pathname` here.
  const back = () => window.history.back();

  const matched = useMemo(() => {
    for (const route of routes) {
      const params = matchPath(route.path, pathname);
      if (params) {
        return route.element(params);
      }
    }
    return null;
  }, [routes, pathname]);

  return (
    <NavigationProvider value={{ push, replace, back }}>
      {matched ?? notFound}
    </NavigationProvider>
  );
};
