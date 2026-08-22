import { useMedia } from 'tamagui';

// `media.sm` is `undefined` on SSR first paint and in the Jest Tamagui
// mock — both cases intentionally fall back to the desktop layout, so the
// compact layout is an explicit opt-in rather than an accidental default.
export const useIsCompactLayout = () => {
  const media = useMedia();
  return media.sm === true;
};
