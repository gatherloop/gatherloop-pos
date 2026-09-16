import { match, P } from 'ts-pattern';
import { PaymentSummary } from '../entities';
import { PaymentRepository } from '../repositories';
import { Usecase } from './IUsecase';

export const ORDER_HISTORY_LIMIT = 20;

type Context = {
  payments: PaymentSummary[];
  errorMessage: string | null;
};

export type OrderHistoryState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type OrderHistoryAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; payments: PaymentSummary[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE_FINISH'; payments: PaymentSummary[] };

export type OrderHistoryParams = {
  payments: PaymentSummary[];
};

export class OrderHistoryUsecase extends Usecase<
  OrderHistoryState,
  OrderHistoryAction,
  OrderHistoryParams
> {
  params: OrderHistoryParams;
  repository: PaymentRepository;

  constructor(repository: PaymentRepository, params: OrderHistoryParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState() {
    const state: OrderHistoryState = {
      type: this.params.payments.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      payments: this.params.payments,
    };
    return state;
  }

  getNextState(state: OrderHistoryState, action: OrderHistoryAction) {
    return match([state, action])
      .returnType<OrderHistoryState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { payments }]) => ({
          ...state,
          type: 'loaded',
          payments,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
        errorMessage: null,
      }))
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { payments }]) => ({
          ...state,
          type: 'loaded',
          payments,
          errorMessage: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: OrderHistoryState,
    dispatch: (action: OrderHistoryAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchPayments({ limit: ORDER_HISTORY_LIMIT, skip: 0 })
          .then(({ payments }) => dispatch({ type: 'FETCH_SUCCESS', payments }))
          .catch(() =>
            dispatch({ type: 'FETCH_ERROR', message: 'Failed to fetch orders' })
          )
      )
      .with({ type: 'revalidating' }, ({ payments }) => {
        this.repository
          .fetchPayments({ limit: ORDER_HISTORY_LIMIT, skip: 0 })
          .then((result) =>
            dispatch({ type: 'REVALIDATE_FINISH', payments: result.payments })
          )
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', payments }));
      })
      .otherwise(() => {
        // No action needed for other states
      });
  }
}
