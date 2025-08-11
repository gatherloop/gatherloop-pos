import { match } from 'ts-pattern';
import { CouponRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  couponId: number | null;
};

export type CouponDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type CouponDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; couponId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class CouponDeleteUsecase extends Usecase<
  CouponDeleteState,
  CouponDeleteAction
> {
  params: undefined;
  repository: CouponRepository;

  constructor(repository: CouponRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): CouponDeleteState {
    return {
      type: 'hidden',
      couponId: null,
    };
  }
  getNextState(
    state: CouponDeleteState,
    action: CouponDeleteAction
  ): CouponDeleteState {
    return match([state, action])
      .returnType<CouponDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { couponId }]) => ({ type: 'shown', couponId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        couponId: null,
      }))
      .with([{ type: 'shown' }, { type: 'DELETE' }], ([state]) => ({
        ...state,
        type: 'deleting',
      }))
      .with([{ type: 'deleting' }, { type: 'DELETE_ERROR' }], ([state]) => ({
        ...state,
        type: 'deletingError',
      }))
      .with(
        [{ type: 'deletingError' }, { type: 'DELETE_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'shown',
        })
      )
      .with([{ type: 'deleting' }, { type: 'DELETE_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'deletingSuccess',
      }))
      .with(
        [{ type: 'deletingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({
          ...state,
          type: 'hidden',
          CouponId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: CouponDeleteState,
    dispatch: (action: CouponDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ couponId }) => {
        this.repository
          .deleteCouponById(couponId ?? NaN)
          .then(() => dispatch({ type: 'DELETE_SUCCESS' }))
          .catch(() => dispatch({ type: 'DELETE_ERROR' }));
      })
      .with({ type: 'deletingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'deletingError' }, () => {
        dispatch({ type: 'DELETE_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
