import { useEffect, useState } from 'react';

// Mobile browsers resize `window.visualViewport` — not the layout viewport —
// when the on-screen keyboard opens, so a `Sheet.Frame` sized with a fixed
// `100vh` keeps its full height and its pinned footer or the focused input
// can end up hidden behind the keyboard (PRD "rental checkin mobile" Phase
// 4, "Code-entry ergonomics in the sheet"). Track the visual viewport
// height so the frame can be capped to the space actually free of the
// keyboard. Returns `undefined` on native and in environments without the
// API, where the caller falls back to its default height.
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
