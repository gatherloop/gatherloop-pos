import { focusManager } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

export type ReactQueryNativeManagerProps = {
  children: ReactNode;
};

export const ReactQueryNativeManager = ({
  children,
}: ReactQueryNativeManagerProps) => {
  function onAppStateChange(status: AppStateStatus) {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return children;
};
