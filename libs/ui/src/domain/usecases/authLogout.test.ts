import {
  AuthLogoutUsecase,
  AuthLogoutState,
  AuthLogoutAction,
} from './authLogout';
import { MockAuthRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('AuthLogoutUsecase', () => {
  describe('success flow', () => {
    const repository = new MockAuthRepository();
    const usecase = new AuthLogoutUsecase(repository);
    let tester: UsecaseTester<AuthLogoutUsecase, AuthLogoutState, AuthLogoutAction, undefined>;

    it('initializes in idle state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('idle');
    });

    it('transitions to loading when LOGOUT is dispatched', () => {
      tester.dispatch({ type: 'LOGOUT' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful logout', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow', () => {
    const repository = new MockAuthRepository();
    repository.setShouldFail(true);
    const usecase = new AuthLogoutUsecase(repository);
    let tester: UsecaseTester<AuthLogoutUsecase, AuthLogoutState, AuthLogoutAction, undefined>;

    it('initializes in idle state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('idle');
    });

    it('transitions to loading when LOGOUT is dispatched', () => {
      tester.dispatch({ type: 'LOGOUT' });
      expect(tester.state.type).toBe('loading');
    });

    it('returns to idle state after logout error', async () => {
      await Promise.resolve();
      // LOGOUT_ERROR transitions back to idle
      expect(tester.state.type).toBe('idle');
    });
  });
});
