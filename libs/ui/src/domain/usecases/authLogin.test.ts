import {
  AuthLoginUsecase,
  AuthLoginState,
  AuthLoginAction,
} from './authLogin';
import { MockAuthRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('AuthLoginUsecase', () => {
  describe('success flow', () => {
    const repository = new MockAuthRepository();
    const usecase = new AuthLoginUsecase(repository);
    let tester: UsecaseTester<AuthLoginUsecase, AuthLoginState, AuthLoginAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { username: 'user', password: 'pass' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful login', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    const repository = new MockAuthRepository();
    repository.setShouldFail(true);
    const usecase = new AuthLoginUsecase(repository);
    let tester: UsecaseTester<AuthLoginUsecase, AuthLoginState, AuthLoginAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { username: 'user', password: 'pass' } });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
