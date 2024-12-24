import { useState } from 'react';

export const useSidebarState = () => {
  const [isShown, setIsShown] = useState(true);

  const onToggleButtonPress = () => setIsShown((prev) => !prev);

  return { isShown, onToggleButtonPress };
};
