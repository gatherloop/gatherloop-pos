import { useMedia } from 'tamagui';

export const useIsCompactLayout = () => {
  const media = useMedia();
  return media.sm === true;
};
