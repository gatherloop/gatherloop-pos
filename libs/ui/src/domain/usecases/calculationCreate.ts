import { match, P } from 'ts-pattern';
import { CalculationForm, Wallet } from '../entities';
import { CalculationRepository, WalletRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: CalculationForm;
  wallets: Wallet[];
};

export type CalculationCreateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type CalculationCreateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'FETCH_SUCCESS'; wallets: Wallet[] }
  | { type: 'SUBMIT'; values: CalculationForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type CalculationCreateParams = {
  wallets: Wallet[];
};

export class CalculationCreateUsecase extends Usecase<
  CalculationCreateState,
  CalculationCreateAction,
  CalculationCreateParams
> {
  params: CalculationCreateParams;
  calculationRepository: CalculationRepository;
  walletRepository: WalletRepository;

  constructor(
    calculationRepository: CalculationRepository,
    walletRepository: WalletRepository,
    params: CalculationCreateParams
  ) {
    super();
    this.calculationRepository = calculationRepository;
    this.walletRepository = walletRepository;
    this.params = params;
  }

  getInitialState(): CalculationCreateState {
    const isLoaded = this.params.wallets.length > 0;
    return {
      type: isLoaded ? 'loaded' : 'idle',
      errorMessage: null,
      wallets: this.params.wallets,
      values: {
        walletId: NaN,
        totalWallet: NaN,
        calculationItems: [
          { price: 100000, amount: 0 },
          { price: 50000, amount: 0 },
          { price: 20000, amount: 0 },
          { price: 10000, amount: 0 },
          { price: 5000, amount: 0 },
          { price: 2000, amount: 0 },
          { price: 1000, amount: 0 },
          { price: 500, amount: 0 },
          { price: 200, amount: 0 },
          { price: 100, amount: 0 },
        ],
      },
    };
  }

  getNextState(
    state: CalculationCreateState,
    action: CalculationCreateAction
  ): CalculationCreateState {
    return match([state, action])
      .returnType<CalculationCreateState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({
          ...state,
          type: 'loading',
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'error',
          errorMessage,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { wallets }]) => ({
          ...state,
          type: 'loaded',
          wallets,
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
    state: CalculationCreateState,
    dispatch: (action: CalculationCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'loading' }, () => {
        this.walletRepository
          .fetchWalletList()
          .then((wallets) => {
            dispatch({ type: 'FETCH_SUCCESS', wallets });
          })
          .catch(() =>
            dispatch({ type: 'FETCH_ERROR', errorMessage: 'Fetch failed' })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.calculationRepository
          .createCalculation(values)
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
