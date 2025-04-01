import { match } from 'ts-pattern';
import { CalculationForm, Wallet } from '../entities';
import { CalculationRepository, WalletRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: CalculationForm;
  wallets: Wallet[];
};

export type CalculationUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type CalculationUpdateAction =
  | { type: 'FETCH' }
  | {
      type: 'FETCH_SUCCESS';
      values: CalculationForm;
      wallets: Wallet[];
    }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: CalculationForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class CalculationUpdateUsecase extends Usecase<
  CalculationUpdateState,
  CalculationUpdateAction
> {
  walletRepository: WalletRepository;
  calculationRepository: CalculationRepository;

  constructor(
    calculationRepository: CalculationRepository,
    walletRepository: WalletRepository
  ) {
    super();
    this.calculationRepository = calculationRepository;
    this.walletRepository = walletRepository;
  }

  getInitialState(): CalculationUpdateState {
    const calculationId =
      this.calculationRepository.getCalculationByIdServerParams();
    const calculation = calculationId
      ? this.calculationRepository.getCalculationById(calculationId)
      : null;

    const wallets = this.walletRepository.getWalletList();
    const isLoaded = calculation !== null && wallets.length > 0;
    return {
      type: isLoaded ? 'loaded' : 'idle',
      errorMessage: null,
      wallets,
      values: {
        walletId: calculation?.wallet.id ?? NaN,
        totalWallet: calculation?.totalWallet ?? 0,
        calculationItems: calculation?.calculationItems ?? [],
      },
    };
  }

  getNextState(
    state: CalculationUpdateState,
    action: CalculationUpdateAction
  ): CalculationUpdateState {
    return match([state, action])
      .returnType<CalculationUpdateState>()
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
        ([state, { values, wallets }]) => ({
          ...state,
          type: 'loaded',
          values,
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
    state: CalculationUpdateState,
    dispatch: (action: CalculationUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        const calculationId =
          this.calculationRepository.getCalculationByIdServerParams() ?? NaN;

        Promise.all([
          this.calculationRepository.fetchCalculationById(calculationId),
          this.walletRepository.fetchWalletList(),
        ])
          .then(([calculation, wallets]) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                walletId: calculation.wallet.id,
                totalWallet: calculation.totalWallet,
                calculationItems: calculation.calculationItems,
              },
              wallets,
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch calculation',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        const calculationId =
          this.calculationRepository.getCalculationByIdServerParams() ?? NaN;
        this.calculationRepository
          .updateCalculation(values, calculationId)
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
