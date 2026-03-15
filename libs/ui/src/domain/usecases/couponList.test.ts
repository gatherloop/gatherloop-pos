import {
  CouponListUsecase,
  CouponListAction,
  CouponListState,
  CouponListParams,
} from './couponList';
import { MockCouponRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CouponListUsecase', () => {
  describe('success flow', () => {
    const repository = new MockCouponRepository();
    const usecase = new CouponListUsecase(repository, { coupons: [] });
    let couponList: UsecaseTester<
      CouponListUsecase,
      CouponListState,
      CouponListAction,
      CouponListParams
    >;

    it('initialize with loading state', () => {
      couponList = new UsecaseTester<
        CouponListUsecase,
        CouponListState,
        CouponListAction,
        CouponListParams
      >(usecase);

      expect(couponList.state).toEqual({
        type: 'loading',
        coupons: [],
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(couponList.state).toEqual({
        type: 'loaded',
        coupons: repository.coupons,
        errorMessage: null,
      });
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
      couponList.dispatch({ type: 'FETCH' });
      expect(couponList.state).toEqual({
        type: 'revalidating',
        coupons: repository.coupons,
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(couponList.state).toEqual({
        type: 'loaded',
        coupons: repository.coupons,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    const repository = new MockCouponRepository();
    repository.setShouldFail(true);
    const usecase = new CouponListUsecase(repository, { coupons: [] });
    let couponList: UsecaseTester<
      CouponListUsecase,
      CouponListState,
      CouponListAction,
      CouponListParams
    >;

    it('initialize with loading state', () => {
      couponList = new UsecaseTester<
        CouponListUsecase,
        CouponListState,
        CouponListAction,
        CouponListParams
      >(usecase);

      expect(couponList.state).toEqual({
        type: 'loading',
        coupons: [],
        errorMessage: null,
      });
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(couponList.state).toEqual({
        type: 'error',
        coupons: [],
        errorMessage: 'Failed to fetch coupons',
      });
    });

    it('transition to loading state after FETCH action is dispatched', () => {
      repository.setShouldFail(false);
      couponList.dispatch({ type: 'FETCH' });
      expect(couponList.state).toEqual({
        type: 'loading',
        coupons: [],
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(couponList.state).toEqual({
        type: 'loaded',
        coupons: repository.coupons,
        errorMessage: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockCouponRepository();

    const coupons = [repository.coupons[0]];

    const usecase = new CouponListUsecase(repository, { coupons });

    const couponList = new UsecaseTester<
      CouponListUsecase,
      CouponListState,
      CouponListAction,
      CouponListParams
    >(usecase);

    expect(couponList.state).toEqual({
      type: 'loaded',
      coupons,
      errorMessage: null,
    });
  });
});
