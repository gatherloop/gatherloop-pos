import { match, P } from 'ts-pattern';
import { Payment, PaymentMethod } from '../entities';
import { PaymentRepository } from '../repositories';
import { Usecase } from './IUsecase';

const CANCEL_ERROR_MESSAGE = 'Gagal membatalkan pembayaran. Silakan coba lagi.';

type Context = {
  reference: string;
  method: PaymentMethod;
  result: Payment | null;
  errorMessage: string | null;
};

export type PaymentCancelState = (
  | { type: 'idle' }
  | { type: 'confirming' }
  | { type: 'cancelling' }
  | { type: 'settled' }
  | { type: 'error' }
) &
  Context;

export type PaymentCancelAction =
  | { type: 'REQUEST' }
  | { type: 'DISMISS' }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL_SUCCESS'; payment: Payment }
  | { type: 'CANCEL_ERROR'; message: string };

export type PaymentCancelParams = {
  reference: string;
  method: PaymentMethod;
};

export class PaymentCancelUsecase extends Usecase<
  PaymentCancelState,
  PaymentCancelAction,
  PaymentCancelParams
> {
  params: PaymentCancelParams;
  private repository: PaymentRepository;

  constructor(repository: PaymentRepository, params: PaymentCancelParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): PaymentCancelState {
    return {
      type: 'idle',
      reference: this.params.reference,
      method: this.params.method,
      result: null,
      errorMessage: null,
    };
  }

  getNextState(
    state: PaymentCancelState,
    action: PaymentCancelAction
  ): PaymentCancelState {
    return match([state, action])
      .returnType<PaymentCancelState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'REQUEST' }],
        ([state]) => ({ ...state, type: 'confirming', errorMessage: null })
      )
      .with([{ type: 'confirming' }, { type: 'DISMISS' }], ([state]) => ({
        ...state,
        type: 'idle',
      }))
      .with([{ type: 'confirming' }, { type: 'CONFIRM' }], ([state]) => ({
        ...state,
        type: 'cancelling',
      }))
      .with(
        [{ type: 'cancelling' }, { type: 'CANCEL_SUCCESS' }],
        ([state, { payment }]) => ({
          ...state,
          type: 'settled',
          result: payment,
        })
      )
      .with(
        [{ type: 'cancelling' }, { type: 'CANCEL_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: PaymentCancelState,
    dispatch: (action: PaymentCancelAction) => void
  ): void {
    match(state)
      .with({ type: 'cancelling' }, ({ reference }) => {
        this.repository
          .cancelPayment(reference)
          .then((payment) => dispatch({ type: 'CANCEL_SUCCESS', payment }))
          .catch(() =>
            dispatch({ type: 'CANCEL_ERROR', message: CANCEL_ERROR_MESSAGE })
          );
      })
      .otherwise(() => {
        // No action needed for other states
      });
  }
}
