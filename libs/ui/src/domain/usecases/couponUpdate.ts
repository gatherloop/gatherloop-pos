import { match } from 'ts-pattern';
import { Coupon, CouponForm } from '../entities';
import { CouponRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: CouponForm;
};

export type CouponUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type CouponUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: CouponForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: CouponForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type CouponUpdateParams = {
  couponId: number;
  coupon: Coupon | null;
};

export class CouponUpdateUsecase extends Usecase<
  CouponUpdateState,
  CouponUpdateAction,
  CouponUpdateParams
> {
  params: CouponUpdateParams;
  repository: CouponRepository;

  constructor(repository: CouponRepository, params: CouponUpdateParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): CouponUpdateState {
    return {
      type: this.params.coupon !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values: {
        amount: this.params.coupon?.amount ?? 0,
        code: this.params.coupon?.code ?? '',
        type: this.params.coupon?.type ?? 'fixed',
      },
    };
  }

  getNextState(
    state: CouponUpdateState,
    action: CouponUpdateAction
  ): CouponUpdateState {
    return match([state, action])
      .returnType<CouponUpdateState>()
      .with([{ type: 'idle' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'error',
          errorMessage,
        })
      )
      .with([{ type: 'error' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { values }]) => ({
          ...state,
          type: 'loaded',
          values,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({
          ...state,
          values,
          type: 'submitting',
        })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'submitSuccess',
        })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'submitError',
          errorMessage,
        })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: CouponUpdateState,
    dispatch: (action: CouponUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchCouponById(this.params.couponId)
          .then((coupon) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                amount: coupon.amount,
                code: coupon.code,
                type: coupon.type,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch coupon',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .updateCoupon(values, this.params.couponId)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .with({ type: 'submitError' }, () => {
        dispatch({ type: 'SUBMIT_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
