import Router from 'next/router';

export function installBackNavigationGuard(
  onBackAttempt: () => void
): () => void {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  }

  let isRestoring = false;

  Router.beforePopState(() => {
    if (isRestoring) {
      return true;
    }

    isRestoring = true;
    window.history.pushState(window.history.state, '', Router.asPath);
    isRestoring = false;

    onBackAttempt();

    return false;
  });

  return () => {
    Router.beforePopState(() => true);
  };
}
