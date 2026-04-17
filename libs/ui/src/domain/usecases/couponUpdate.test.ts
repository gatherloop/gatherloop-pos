import {
  CouponUpdateUsecase,
  CouponUpdateState,
  CouponUpdateAction,
  CouponUpdateParams,
} from './couponUpdate';
import { MockCouponRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CouponUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const repository = new MockCouponRepository();
      const usecase = new CouponUpdateUsecase(repository, { couponId: 1, coupon: null });
      const tester = new UsecaseTester<CouponUpdateUsecase, CouponUpdateState, CouponUpdateAction, CouponUpdateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { code: 'UPDATED', type: 'fixed', amount: 5000 } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockCouponRepository();
      repository.setShouldFail(true);
      const usecase = new CouponUpdateUsecase(repository, { couponId: 1, coupon: null });
      const tester = new UsecaseTester<CouponUpdateUsecase, CouponUpdateState, CouponUpdateAction, CouponUpdateParams>(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockCouponRepository();
      repository.setShouldFail(true);
      const usecase = new CouponUpdateUsecase(repository, {
        couponId: 1,
        coupon: repository.coupons[0],
      });
      const tester = new UsecaseTester<CouponUpdateUsecase, CouponUpdateState, CouponUpdateAction, CouponUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { code: 'UPDATED', type: 'fixed', amount: 5000 } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockCouponRepository();
    const existing = repository.coupons[0];
    const usecase = new CouponUpdateUsecase(repository, { couponId: 1, coupon: existing });
    const tester = new UsecaseTester<CouponUpdateUsecase, CouponUpdateState, CouponUpdateAction, CouponUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
