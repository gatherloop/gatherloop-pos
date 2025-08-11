import { match, P } from 'ts-pattern';
import { Coupon } from '../entities';
import { CouponRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  coupons: Coupon[];
  errorMessage: string | null;
};

export type CouponListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type CouponListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; coupons: Coupon[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE'; coupons: Coupon[] }
  | { type: 'REVALIDATE_FINISH'; coupons: Coupon[] };

export type CouponListParams = {
  coupons: Coupon[];
};

export class CouponListUsecase extends Usecase<
  CouponListState,
  CouponListAction,
  CouponListParams
> {
  params: CouponListParams;
  repository: CouponRepository;

  constructor(repository: CouponRepository, params: CouponListParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState() {
    const state: CouponListState = {
      type: this.params.coupons.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      coupons: this.params.coupons,
    };
    return state;
  }

  getNextState(state: CouponListState, action: CouponListAction) {
    return match([state, action])
      .returnType<CouponListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { coupons }]) => ({
          ...state,
          type: 'loaded',
          coupons,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
        errorMessage: null,
      }))
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { coupons }]) => ({
          ...state,
          type: 'loaded',
          coupons,
          errorMessage: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: CouponListState,
    dispatch: (action: CouponListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchCouponList()
          .then((coupons) => dispatch({ type: 'FETCH_SUCCESS', coupons }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch coupons',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ coupons }) => {
        this.repository
          .fetchCouponList()
          .then((coupons) => dispatch({ type: 'REVALIDATE_FINISH', coupons }))
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', coupons }));
      })
      .otherwise(() => {
        // No action needed for other states
      });
  }
}
