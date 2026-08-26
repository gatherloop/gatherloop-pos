// Stub for next/router in the Storybook web environment.
// libs/ui/src/utils/queryParam.ts calls `Router.replace()` directly (outside the
// solito/router port, which is stubbed separately) to update the URL's query string
// without a navigation. Solito's own web router implementation also imports
// `useRouter` from this module. Storybook never runs inside a real Next.js
// app/router context, and bundling the real next/router drags Next's
// server/build-only internals (which reference Node core modules like zlib) into
// the browser bundle. No-op stubs are enough to keep both imports resolvable.

/* eslint-disable @typescript-eslint/no-empty-function */
const Router = {
  replace: () => {},
  push: () => {},
};

export default Router;

export const useRouter = () => ({
  pathname: '',
  route: '',
  query: {},
  asPath: '',
  push: () => Promise.resolve(true),
  replace: () => Promise.resolve(true),
  reload: () => {},
  back: () => {},
  prefetch: () => Promise.resolve(),
  beforePopState: () => {},
  events: { on: () => {}, off: () => {}, emit: () => {} },
  isFallback: false,
});
