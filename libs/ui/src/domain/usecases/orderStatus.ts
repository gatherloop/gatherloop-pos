import { match, P } from 'ts-pattern';
import { Payment } from '../entities';
import { PaymentNotFoundError, PaymentRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  reference: string;
  payment: Payment | null;
  errorMessage: string | null;
  isPolling: boolean;
};

export type OrderStatusState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'awaitingPayment' }
  | { type: 'loaded' }
  | { type: 'expired' }
  | { type: 'notFound' }
  | { type: 'error' }
) &
  Context;

export type OrderStatusAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; payment: Payment }
  | { type: 'FETCH_NOT_FOUND' }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'POLL' }
  | { type: 'POLL_SUCCESS'; payment: Payment }
  | { type: 'POLL_ERROR'; message: string }
  | { type: 'COUNTDOWN_ELAPSED' }
  | { type: 'EXPIRE' };

export type OrderStatusParams = {
  reference: string;
  payment?: Payment | null;
};

function stateTypeForPayment(
  payment: Payment
): 'awaitingPayment' | 'loaded' | 'expired' {
  return match(payment.status)
    .with('pending', () => 'awaitingPayment' as const)
    .with('paid', () => 'loaded' as const)
    .with('expired', 'failed', () => 'expired' as const)
    .exhaustive();
}

export class OrderStatusUsecase extends Usecase<
  OrderStatusState,
  OrderStatusAction,
  OrderStatusParams
> {
  params: OrderStatusParams;
  private repository: PaymentRepository;
  private pollTimerId: ReturnType<typeof setInterval> | null = null;

  constructor(repository: PaymentRepository, params: OrderStatusParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): OrderStatusState {
    const context: Context = {
      reference: this.params.reference,
      payment: this.params.payment ?? null,
      errorMessage: null,
      isPolling: false,
    };

    if (this.params.payment !== undefined) {
      return {
        ...context,
        type:
          this.params.payment === null
            ? 'notFound'
            : stateTypeForPayment(this.params.payment),
      };
    }

    return { ...context, type: 'idle' };
  }

  getNextState(
    state: OrderStatusState,
    action: OrderStatusAction
  ): OrderStatusState {
    return match([state, action])
      .returnType<OrderStatusState>()
      .with(
        [{ type: 'idle' }, { type: 'FETCH' }],
        [{ type: 'error' }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { payment }]) => ({
          ...state,
          type: stateTypeForPayment(payment),
          payment,
          errorMessage: null,
          isPolling: false,
        })
      )
      .with([{ type: 'loading' }, { type: 'FETCH_NOT_FOUND' }], ([state]) => ({
        ...state,
        type: 'notFound',
        payment: null,
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with(
        [
          { type: 'awaitingPayment', isPolling: false },
          { type: P.union('POLL', 'COUNTDOWN_ELAPSED') },
        ],
        ([state]) => ({ ...state, isPolling: true })
      )
      .with(
        [{ type: 'awaitingPayment' }, { type: 'POLL_SUCCESS' }],
        ([state, { payment }]) => ({
          ...state,
          type: payment.status === 'paid' ? 'loaded' : 'awaitingPayment',
          payment,
          isPolling: false,
        })
      )
      .with(
        [{ type: 'awaitingPayment' }, { type: 'POLL_ERROR' }],
        ([state]) => ({ ...state, isPolling: false })
      )
      .with([{ type: 'awaitingPayment' }, { type: 'EXPIRE' }], ([state]) => ({
        ...state,
        type: 'expired',
        isPolling: false,
      }))
      .otherwise(() => state);
  }

  onStateChange(
    state: OrderStatusState,
    dispatch: (action: OrderStatusAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, ({ reference }) => {
        this.repository
          .fetchPayment(reference)
          .then((payment) => dispatch({ type: 'FETCH_SUCCESS', payment }))
          .catch((error) => {
            if (error instanceof PaymentNotFoundError) {
              dispatch({ type: 'FETCH_NOT_FOUND' });
            } else {
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch order status',
              });
            }
          });
      })
      .with({ type: 'awaitingPayment' }, (state) => {
        if (this.pollTimerId === null) {
          this.pollTimerId = setInterval(
            () => dispatch({ type: 'POLL' }),
            3000
          );
        }

        if (state.isPolling && state.payment) {
          this.repository
            .fetchPayment(state.payment.reference)
            .then((payment) => {
              if (payment.status === 'expired' || payment.status === 'failed') {
                dispatch({ type: 'EXPIRE' });
              } else {
                dispatch({ type: 'POLL_SUCCESS', payment });
              }
            })
            .catch(() =>
              dispatch({
                type: 'POLL_ERROR',
                message: 'Failed to check payment status',
              })
            );
        }
      })
      .otherwise(() => {
        if (this.pollTimerId !== null) {
          clearInterval(this.pollTimerId);
          this.pollTimerId = null;
        }
      });
  }
}
