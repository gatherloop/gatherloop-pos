import {
  CouponUpdateUsecase,
  CouponUpdateState,
  CouponUpdateAction,
  CouponUpdateParams,
} from './couponUpdate';
import { MockCouponRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CouponUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    const repository = new MockCouponRepository();
    const usecase = new CouponUpdateUsecase(repository, { couponId: 1, coupon: null });
    let tester: UsecaseTester<CouponUpdateUsecase, CouponUpdateState, CouponUpdateAction, CouponUpdateParams>;

    it('initializes in loading state when no data preloaded', () => {
      tester = new UsecaseTester(usecase);
      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { code: 'UPDATED', type: 'fixed', amount: 5000 } });
      expect(tester.state.type).toBe('submitting');
    });

    it('transitions to submitSuccess after successful submit', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    const repository = new MockCouponRepository();
    repository.setShouldFail(true);
    const usecase = new CouponUpdateUsecase(repository, { couponId: 1, coupon: null });
    let tester: UsecaseTester<CouponUpdateUsecase, CouponUpdateState, CouponUpdateAction, CouponUpdateParams>;

    it('initializes in loading state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('error');
    });

    it('transitions to loading when FETCH is dispatched from error', () => {
      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');
    });

    it('transitions to loaded after successful fetch', async () => {
      await Promise.resolve();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    const repository = new MockCouponRepository();
    repository.setShouldFail(true);
    const usecase = new CouponUpdateUsecase(repository, {
      couponId: 1,
      coupon: repository.coupons[0],
    });
    let tester: UsecaseTester<CouponUpdateUsecase, CouponUpdateState, CouponUpdateAction, CouponUpdateParams>;

    it('initializes in loaded state when data is preloaded', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('loaded');
    });

    it('transitions to submitting when SUBMIT is dispatched', () => {
      tester.dispatch({ type: 'SUBMIT', values: { code: 'UPDATED', type: 'fixed', amount: 5000 } });
      expect(tester.state.type).toBe('submitting');
    });

    it('recovers to loaded state after submit error', async () => {
      await Promise.resolve();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('loaded');
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
