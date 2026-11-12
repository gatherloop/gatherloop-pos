import { match, P } from 'ts-pattern';
import { Payment, PaymentMethod } from '../entities';
import { PaymentRepository } from '../repositories';
import { Usecase } from './IUsecase';

const CANCEL_ERROR_MESSAGE = 'Gagal membatalkan pembayaran. Silakan coba lagi.';

type Context = {
  result: Payment | null;
  errorMessage: string | null;
};

type PaymentTarget = {
  reference: string;
  method: PaymentMethod;
};

export type PaymentCancelState = (
  | { type: 'idle' }
  | ({ type: 'confirming' } & PaymentTarget)
  | ({ type: 'cancelling' } & PaymentTarget)
  | { type: 'settled' }
  | { type: 'error' }
) &
  Context;

export type PaymentCancelAction =
  | ({ type: 'REQUEST' } & PaymentTarget)
  | { type: 'DISMISS' }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL_SUCCESS'; payment: Payment }
  | { type: 'CANCEL_ERROR'; message: string };

export class PaymentCancelUsecase extends Usecase<
  PaymentCancelState,
  PaymentCancelAction
> {
  params: undefined;
  private repository: PaymentRepository;

  constructor(repository: PaymentRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): PaymentCancelState {
    return {
      type: 'idle',
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
        ([{ result }, { reference, method }]) => ({
          type: 'confirming',
          reference,
          method,
          result,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'confirming' }, { type: 'DISMISS' }],
        ([{ result, errorMessage }]) => ({
          type: 'idle',
          result,
          errorMessage,
        })
      )
      .with([{ type: 'confirming' }, { type: 'CONFIRM' }], ([state]) => ({
        ...state,
        type: 'cancelling',
      }))
      .with(
        [{ type: 'cancelling' }, { type: 'CANCEL_SUCCESS' }],
        ([{ errorMessage }, { payment }]) => ({
          type: 'settled',
          result: payment,
          errorMessage,
        })
      )
      .with(
        [{ type: 'cancelling' }, { type: 'CANCEL_ERROR' }],
        ([{ result }, { message }]) => ({
          type: 'error',
          result,
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
