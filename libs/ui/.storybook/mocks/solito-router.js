/* eslint-disable @typescript-eslint/no-empty-function */
// Stub for solito/router in the Storybook web environment.
// Provides no-op implementations of the router hooks used by Navbar and Sidebar.
export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
  prefetch: () => {},
  canGoBack: () => false,
});

export const useLink = ({ href }) => ({
  href,
  onPress: () => {},
});

export const useParams = () => ({});
export const useUpdateParams = () => () => {};
