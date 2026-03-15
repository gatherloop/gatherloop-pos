import {
  CouponDeleteUsecase,
  CouponDeleteState,
  CouponDeleteAction,
} from './couponDelete';
import { MockCouponRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CouponDeleteUsecase', () => {
  describe('success flow', () => {
    const repository = new MockCouponRepository();
    const usecase = new CouponDeleteUsecase(repository);
    let tester: UsecaseTester<CouponDeleteUsecase, CouponDeleteState, CouponDeleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state).toEqual({ type: 'hidden', couponId: null });
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', couponId: 1 });
      expect(tester.state).toEqual({ type: 'shown', couponId: 1 });
    });

    it('transitions to deleting when DELETE is dispatched', () => {
      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');
    });

    it('auto-transitions to hidden after successful delete', async () => {
      await Promise.resolve();
      // deletingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockCouponRepository();
    const usecase = new CouponDeleteUsecase(repository);
    const tester = new UsecaseTester<CouponDeleteUsecase, CouponDeleteState, CouponDeleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', couponId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    const repository = new MockCouponRepository();
    repository.setShouldFail(true);
    const usecase = new CouponDeleteUsecase(repository);
    let tester: UsecaseTester<CouponDeleteUsecase, CouponDeleteState, CouponDeleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('hidden');
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', couponId: 1 });
      expect(tester.state.type).toBe('shown');
    });

    it('transitions to deleting when DELETE is dispatched', () => {
      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');
    });

    it('auto-recovers to shown state after delete error', async () => {
      await Promise.resolve();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
