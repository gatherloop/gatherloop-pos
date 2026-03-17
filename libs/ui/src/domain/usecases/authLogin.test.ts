import {
  AuthLoginUsecase,
  AuthLoginState,
  AuthLoginAction,
} from './authLogin';
import { MockAuthRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('AuthLoginUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockAuthRepository();
      const usecase = new AuthLoginUsecase(repository);
      const tester = new UsecaseTester<AuthLoginUsecase, AuthLoginState, AuthLoginAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { username: 'user', password: 'pass' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (error auto-recovers)', async () => {
      const repository = new MockAuthRepository();
      repository.setShouldFail(true);
      const usecase = new AuthLoginUsecase(repository);
      const tester = new UsecaseTester<AuthLoginUsecase, AuthLoginState, AuthLoginAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { username: 'user', password: 'pass' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });
});
