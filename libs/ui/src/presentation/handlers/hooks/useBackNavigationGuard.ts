import { useEffect } from 'react';
import { installBackNavigationGuard } from '../../../utils';

export function useBackNavigationGuard(
  enabled: boolean,
  onBackAttempt: () => void
) {
  useEffect(() => {
    if (!enabled) return;

    return installBackNavigationGuard(onBackAttempt);
  }, [enabled, onBackAttempt]);
}
