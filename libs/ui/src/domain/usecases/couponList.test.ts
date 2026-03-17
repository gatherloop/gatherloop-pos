import {
  CouponListUsecase,
  CouponListAction,
  CouponListState,
  CouponListParams,
} from './couponList';
import { MockCouponRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CouponListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded', async () => {
      const repository = new MockCouponRepository();
      const usecase = new CouponListUsecase(repository, { coupons: [] });
      const couponList = new UsecaseTester<
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

      await flushPromises();
      expect(couponList.state).toEqual({
        type: 'loaded',
        coupons: repository.coupons,
        errorMessage: null,
      });

      couponList.dispatch({ type: 'FETCH' });
      expect(couponList.state).toEqual({
        type: 'revalidating',
        coupons: repository.coupons,
        errorMessage: null,
      });

      await flushPromises();
      expect(couponList.state).toEqual({
        type: 'loaded',
        coupons: repository.coupons,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockCouponRepository();
      repository.setShouldFail(true);
      const usecase = new CouponListUsecase(repository, { coupons: [] });
      const couponList = new UsecaseTester<
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

      await flushPromises();
      expect(couponList.state).toEqual({
        type: 'error',
        coupons: [],
        errorMessage: 'Failed to fetch coupons',
      });

      repository.setShouldFail(false);
      couponList.dispatch({ type: 'FETCH' });
      expect(couponList.state).toEqual({
        type: 'loading',
        coupons: [],
        errorMessage: null,
      });

      await flushPromises();
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
