/* eslint-disable @typescript-eslint/no-empty-function */
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
