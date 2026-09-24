import Router from 'next/router';
import { installBackNavigationGuard } from './backNavigationGuard';

describe('installBackNavigationGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    Router.asPath = '/';
  });

  it('registers a beforePopState handler', () => {
    installBackNavigationGuard(jest.fn());

    expect(Router.beforePopState).toHaveBeenCalledWith(expect.any(Function));
  });

  it('swallows a pop: restores the current entry, calls the handler, and returns false', () => {
    const onBackAttempt = jest.fn();
    const pushStateSpy = jest.spyOn(window.history, 'pushState');
    Router.asPath = '/orders/ref-1';

    installBackNavigationGuard(onBackAttempt);
    const beforePopState = (Router.beforePopState as jest.Mock).mock
      .calls[0][0];

    const result = beforePopState();

    expect(result).toBe(false);
    expect(pushStateSpy).toHaveBeenCalledWith(
      window.history.state,
      '',
      '/orders/ref-1'
    );
    expect(onBackAttempt).toHaveBeenCalledTimes(1);
  });

  it('ignores the pop caused by its own restore', () => {
    const onBackAttempt = jest.fn();
    const beforePopStateRef: { current?: () => boolean } = {};
    let nestedResult: boolean | undefined;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {
      nestedResult = beforePopStateRef.current?.();
    });

    installBackNavigationGuard(onBackAttempt);
    beforePopStateRef.current = (Router.beforePopState as jest.Mock).mock
      .calls[0][0];

    const result = beforePopStateRef.current();

    expect(nestedResult).toBe(true);
    expect(result).toBe(false);
    expect(onBackAttempt).toHaveBeenCalledTimes(1);
  });

  it('dispose restores default popstate handling', () => {
    const dispose = installBackNavigationGuard(jest.fn());

    dispose();

    const restoredHandler = (Router.beforePopState as jest.Mock).mock
      .calls[1][0];

    expect(restoredHandler()).toBe(true);
  });
});
