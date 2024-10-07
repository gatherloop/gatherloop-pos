import { useEffect } from 'react';

export const useIsFocused = () => {
  return true;
};

export const useFocusEffect = (focusCallback: () => void) => {
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) focusCallback();
  }, [focusCallback, isFocused]);
};
