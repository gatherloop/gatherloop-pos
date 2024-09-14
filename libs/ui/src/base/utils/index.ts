import { useRef } from 'react';

export const useDebounce = () => {
  const ref = useRef<NodeJS.Timeout>();

  const debounce = (callback: () => void, ms: number) => {
    if (ref.current) {
      clearTimeout(ref.current);
    }

    ref.current = setTimeout(callback, ms);
  };

  return debounce;
};
