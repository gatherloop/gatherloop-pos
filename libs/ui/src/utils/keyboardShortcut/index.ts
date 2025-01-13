import { useEffect } from 'react';
import { ShortcutMap } from './types';

export const useKeyboardShortcut = (shortcutMap: ShortcutMap) => {
  useEffect(() => {
    function registerShortcut(event: KeyboardEvent) {
      if (event.ctrlKey && shortcutMap.ctrl && shortcutMap.ctrl[event.key]) {
        event.preventDefault();
        shortcutMap.ctrl[event.key]();
      }

      if (event.altKey && shortcutMap.alt && shortcutMap.alt[event.key]) {
        event.preventDefault();
        shortcutMap.alt[event.key]();
      }

      if (event.shiftKey && shortcutMap.shift && shortcutMap.shift[event.key]) {
        event.preventDefault();
        shortcutMap.shift[event.key]();
      }
    }

    document.addEventListener('keydown', registerShortcut);
    return () => document.removeEventListener('keydown', registerShortcut);
  }, [shortcutMap]);
};
