import { useEffect, useState } from 'react';

export const useWebVisualViewportHeight = () => {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const viewport =
      typeof window !== 'undefined' ? window.visualViewport : undefined;
    if (!viewport) return;

    const update = () => setHeight(viewport.height);
    update();
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);

  return height;
};
