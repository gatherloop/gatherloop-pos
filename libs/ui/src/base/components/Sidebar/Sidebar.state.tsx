import { useState } from 'react';

export const useSidebarState = () => {
  const [isShown, setIsShown] = useState(true);
  const toggleShown = () => setIsShown((prev) => !prev);
  return { isShown, toggleShown };
};
