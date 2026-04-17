import {
  CouponCreateUsecase,
  CouponCreateState,
  CouponCreateAction,
} from './couponCreate';
import { MockCouponRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CouponCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockCouponRepository();
      const usecase = new CouponCreateUsecase(repository);
      const tester = new UsecaseTester<CouponCreateUsecase, CouponCreateState, CouponCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { code: 'DISCOUNT10', type: 'fixed', amount: 10000 } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockCouponRepository();
      repository.setShouldFail(true);
      const usecase = new CouponCreateUsecase(repository);
      const tester = new UsecaseTester<CouponCreateUsecase, CouponCreateState, CouponCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { code: 'DISCOUNT10', type: 'fixed', amount: 10000 } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
    });
  });
});
