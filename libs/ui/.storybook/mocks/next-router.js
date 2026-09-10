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
