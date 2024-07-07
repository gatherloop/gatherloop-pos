import { useEffect, useState } from 'react';
import { useRouter } from 'solito/router';
import { useMedia } from 'tamagui';

export const useSidebarState = () => {
  const media = useMedia();
  const [isShown, setIsShown] = useState(false);
  const router = useRouter();

  const onToggleButtonPress = () => setIsShown((prev) => !prev);

  useEffect(() => {
    setIsShown(media.gtXs);
  }, [media.gtXs]);

  const onMenuItemPress = (path: string) => {
    router.push(path);
  };

  return { isShown, onToggleButtonPress, onMenuItemPress };
};
