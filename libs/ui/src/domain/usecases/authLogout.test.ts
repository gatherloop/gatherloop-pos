import {
  AuthLogoutUsecase,
  AuthLogoutState,
  AuthLogoutAction,
} from './authLogout';
import { MockAuthRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('AuthLogoutUsecase', () => {
  describe('success flow', () => {
    it('should transition idle → loading → loaded', async () => {
      const repository = new MockAuthRepository();
      const usecase = new AuthLogoutUsecase(repository);
      const tester = new UsecaseTester<AuthLogoutUsecase, AuthLogoutState, AuthLogoutAction, undefined>(usecase);

      expect(tester.state.type).toBe('idle');

      tester.dispatch({ type: 'LOGOUT' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow', () => {
    it('should transition idle → loading → idle (error auto-recovers)', async () => {
      const repository = new MockAuthRepository();
      repository.setShouldFail(true);
      const usecase = new AuthLogoutUsecase(repository);
      const tester = new UsecaseTester<AuthLogoutUsecase, AuthLogoutState, AuthLogoutAction, undefined>(usecase);

      expect(tester.state.type).toBe('idle');

      tester.dispatch({ type: 'LOGOUT' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('idle');
    });
  });
});
