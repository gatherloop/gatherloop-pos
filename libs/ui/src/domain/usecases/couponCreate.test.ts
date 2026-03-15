import {
  CouponCreateUsecase,
  CouponCreateState,
  CouponCreateAction,
} from './couponCreate';
import { MockCouponRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CouponCreateUsecase', () => {
  describe('success flow', () => {
    const repository = new MockCouponRepository();
    const usecase = new CouponCreateUsecase(repository);
    let tester: UsecaseTester<CouponCreateUsecase, CouponCreateState, CouponCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { code: 'DISCOUNT10', type: 'fixed', amount: 10000 } });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful create', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    const repository = new MockCouponRepository();
    repository.setShouldFail(true);
    const usecase = new CouponCreateUsecase(repository);
    let tester: UsecaseTester<CouponCreateUsecase, CouponCreateState, CouponCreateAction, undefined>;

    it('initializes in loaded state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { code: 'DISCOUNT10', type: 'fixed', amount: 10000 } });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
    });
  });
});
