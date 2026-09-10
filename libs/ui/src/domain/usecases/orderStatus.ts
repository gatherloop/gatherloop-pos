import { match } from 'ts-pattern';
import { Payment } from '../entities';
import { PaymentNotFoundError, PaymentRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  reference: string;
  payment: Payment | null;
  errorMessage: string | null;
};

// FR-10 in docs/prd-order-checkout-qris-doku.md. Mirrors TableResolveUsecase's
// shape: a single fetch by reference, seedable from getServerSideProps (P6
// in docs/trd-order-app-composition-and-ssr.md) so the first paint is the
// real order and not a spinner. `notFound` covers both an unknown reference
// and one belonging to another session (D18) — the API returns the same 404
// either way, so there is nothing to tell them apart on.
export type OrderStatusState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'notFound' }
  | { type: 'error' }
) &
  Context;

export type OrderStatusAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; payment: Payment }
  | { type: 'FETCH_NOT_FOUND' }
  | { type: 'FETCH_ERROR'; message: string };

export type OrderStatusParams = {
  reference: string;
  // P6 in docs/trd-order-app-composition-and-ssr.md: seeded by the owning
  // page's getServerSideProps. `undefined` (client-only rendering) keeps
  // the idle → loading → loaded/notFound path; `null` seeds `notFound`
  // directly; a `Payment` seeds `loaded` directly — either way the mount
  // fetch this usecase would otherwise make never fires.
  payment?: Payment | null;
};

export class OrderStatusUsecase extends Usecase<
  OrderStatusState,
  OrderStatusAction,
  OrderStatusParams
> {
  params: OrderStatusParams;
  private repository: PaymentRepository;

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
    };

    if (this.params.payment !== undefined) {
      return {
        ...context,
        type: this.params.payment === null ? 'notFound' : 'loaded',
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
          type: 'loaded',
          payment,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_NOT_FOUND' }],
        ([state]) => ({ ...state, type: 'notFound', payment: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
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
      .otherwise(() => {
        // No action needed for other states
      });
  }
}
