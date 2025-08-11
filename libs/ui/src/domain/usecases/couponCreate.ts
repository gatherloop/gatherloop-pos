import { match } from 'ts-pattern';
import { CouponForm } from '../entities';
import { CouponRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: CouponForm;
};

export type CouponCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type CouponCreateAction =
  | { type: 'SUBMIT'; values: CouponForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class CouponCreateUsecase extends Usecase<
  CouponCreateState,
  CouponCreateAction
> {
  params: undefined;
  repository: CouponRepository;

  constructor(repository: CouponRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): CouponCreateState {
    return {
      type: 'loaded',
      errorMessage: null,
      values: {
        amount: 0,
        code: '',
        type: 'fixed',
      },
    };
  }

  getNextState(
    state: CouponCreateState,
    action: CouponCreateAction
  ): CouponCreateState {
    return match([state, action])
      .returnType<CouponCreateState>()
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
    state: CouponCreateState,
    dispatch: (action: CouponCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createCoupon(values)
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
