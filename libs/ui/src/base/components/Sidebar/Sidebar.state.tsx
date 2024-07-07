import { useState } from 'react';
import { useRouter } from 'solito/router';

export const useSidebarState = () => {
  const [isShown, setIsShown] = useState(true);
  const router = useRouter();

  const onToggleButtonPress = () => setIsShown((prev) => !prev);

  const onMenuItemPress = (path: string) => {
    router.push(path);
  };

  return { isShown, onToggleButtonPress, onMenuItemPress };
};
