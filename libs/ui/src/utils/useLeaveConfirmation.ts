import { useEffect, useState } from 'react';
import Router from 'next/router';

export type UseLeaveConfirmationResult = {
  isConfirmOpen: boolean;
  onLeaveConfirm: () => void;
  onLeaveCancel: () => void;
};

const ROUTE_CHANGE_ABORTED = 'routeChange aborted';

export function useLeaveConfirmation(
  isEnabled: boolean
): UseLeaveConfirmationResult {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onRouteChangeStart = (url: string) => {
      // Deferred: React drops state updates made in a handler that throws before returning.
      queueMicrotask(() => {
        setPendingUrl(url);
        setIsConfirmOpen(true);
      });
      Router.events.emit('routeChangeError');
      throw ROUTE_CHANGE_ABORTED;
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    Router.events.on('routeChangeStart', onRouteChangeStart);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      Router.events.off('routeChangeStart', onRouteChangeStart);
    };
  }, [isEnabled]);

  const onLeaveConfirm = () => {
    setIsConfirmOpen(false);
    if (pendingUrl) {
      Router.push(pendingUrl);
    }
    setPendingUrl(null);
  };

  const onLeaveCancel = () => {
    setIsConfirmOpen(false);
    setPendingUrl(null);
  };

  return {
    isConfirmOpen: isEnabled && isConfirmOpen,
    onLeaveConfirm,
    onLeaveCancel,
  };
}
