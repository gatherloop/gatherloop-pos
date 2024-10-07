import { match } from 'ts-pattern';
import { WalletForm } from '../entities';
import { WalletRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: WalletForm;
};

export type WalletCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
) &
  Context;

export type WalletCreateAction =
  | { type: 'SUBMIT'; values: WalletForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string };

export class WalletCreateUsecase extends Usecase<
  WalletCreateState,
  WalletCreateAction
> {
  repository: WalletRepository;

  constructor(repository: WalletRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): WalletCreateState {
    return {
      type: 'loaded',
      errorMessage: null,
      values: {
        name: '',
        balance: 0,
        paymentCostPercentage: 0,
      },
    };
  }

  getNextState(
    state: WalletCreateState,
    action: WalletCreateAction
  ): WalletCreateState {
    return match([state, action])
      .returnType<WalletCreateState>()
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
          type: 'loaded',
          errorMessage,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: WalletCreateState,
    dispatch: (action: WalletCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createWallet(values)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
