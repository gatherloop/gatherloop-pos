import { match, P } from 'ts-pattern';
import { Payment } from '../entities';
import { PaymentNotFoundError, PaymentRepository } from '../repositories';
import { Usecase } from './IUsecase';

const AWAITING_PAYMENT_POLL_INTERVAL_MS = 3000;
const PREPARATION_POLL_INTERVAL_MS = 10_000;

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
  | { type: 'awaitingCashPayment' }
  | { type: 'preparing' }
  | { type: 'ready' }
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
): 'awaitingPayment' | 'awaitingCashPayment' | 'preparing' | 'ready' | 'expired' {
  return match(payment.status)
    .with('pending', () =>
      payment.method === 'cash'
        ? ('awaitingCashPayment' as const)
        : ('awaitingPayment' as const)
    )
    .with('paid', () =>
      payment.fulfillmentStatus === 'ready'
        ? ('ready' as const)
        : ('preparing' as const)
    )
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
  private pollIntervalMs: number | null = null;

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
          {
            type: P.union('awaitingPayment', 'awaitingCashPayment'),
            isPolling: false,
          },
          { type: P.union('POLL', 'COUNTDOWN_ELAPSED') },
        ],
        ([state]) => ({ ...state, isPolling: true })
      )
      .with(
        [
          { type: P.union('awaitingPayment', 'awaitingCashPayment') },
          { type: 'POLL_SUCCESS' },
        ],
        ([state, { payment }]) => ({
          ...state,
          type: payment.status === 'paid' ? stateTypeForPayment(payment) : state.type,
          payment,
          isPolling: false,
        })
      )
      .with(
        [
          { type: P.union('awaitingPayment', 'awaitingCashPayment') },
          { type: 'POLL_ERROR' },
        ],
        ([state]) => ({ ...state, isPolling: false })
      )
      .with(
        [
          { type: P.union('awaitingPayment', 'awaitingCashPayment') },
          { type: 'EXPIRE' },
        ],
        ([state]) => ({
          ...state,
          type: 'expired',
          isPolling: false,
        })
      )
      .with(
        [{ type: 'preparing', isPolling: false }, { type: 'POLL' }],
        ([state]) => ({ ...state, isPolling: true })
      )
      .with(
        [{ type: 'preparing' }, { type: 'POLL_SUCCESS' }],
        ([state, { payment }]) => ({
          ...state,
          type: payment.fulfillmentStatus === 'ready' ? 'ready' : 'preparing',
          payment,
          isPolling: false,
        })
      )
      .with([{ type: 'preparing' }, { type: 'POLL_ERROR' }], ([state]) => ({
        ...state,
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
      .with({ type: P.union('awaitingPayment', 'awaitingCashPayment') }, (state) => {
        this.ensurePollTimer(AWAITING_PAYMENT_POLL_INTERVAL_MS, dispatch);

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
      .with({ type: 'preparing' }, (state) => {
        this.ensurePollTimer(PREPARATION_POLL_INTERVAL_MS, dispatch);

        if (state.isPolling && state.payment) {
          this.repository
            .fetchPayment(state.payment.reference)
            .then((payment) => dispatch({ type: 'POLL_SUCCESS', payment }))
            .catch(() =>
              dispatch({
                type: 'POLL_ERROR',
                message: 'Failed to check order status',
              })
            );
        }
      })
      .otherwise(() => {
        if (this.pollTimerId !== null) {
          clearInterval(this.pollTimerId);
          this.pollTimerId = null;
          this.pollIntervalMs = null;
        }
      });
  }

  private ensurePollTimer(
    intervalMs: number,
    dispatch: (action: OrderStatusAction) => void
  ): void {
    if (this.pollTimerId !== null && this.pollIntervalMs === intervalMs) {
      return;
    }

    if (this.pollTimerId !== null) {
      clearInterval(this.pollTimerId);
    }

    this.pollIntervalMs = intervalMs;
    this.pollTimerId = setInterval(() => dispatch({ type: 'POLL' }), intervalMs);
  }
}
