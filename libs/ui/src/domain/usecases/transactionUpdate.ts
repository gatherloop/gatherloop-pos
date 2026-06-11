import { match } from 'ts-pattern';
import { Transaction, TransactionForm } from '../entities';
import { TransactionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: TransactionForm;
};

function toFormValues(transaction: Transaction): TransactionForm {
  const itemCouponsByItemId = new Map(
    transaction.transactionCoupons
      .filter((transactionCoupon) => transactionCoupon.transactionItemId !== null)
      .map((transactionCoupon) => [transactionCoupon.transactionItemId, transactionCoupon])
  );

  return {
    name: transaction.name,
    orderNumber: transaction.orderNumber,
    transactionItems: transaction.transactionItems.map((item) => {
      const itemCoupon = itemCouponsByItemId.get(item.id);
      return {
        id: item.id,
        amount: item.amount,
        variant: item.variant,
        price: item.price,
        discountAmount: item.discountAmount,
        note: item.note,
        coupon: itemCoupon
          ? { id: itemCoupon.id, coupon: itemCoupon.coupon }
          : undefined,
      };
    }),
    transactionCoupons: transaction.transactionCoupons
      .filter((transactionCoupon) => transactionCoupon.transactionItemId === null)
      .map((transactionCoupon) => ({
        id: transactionCoupon.id,
        coupon: transactionCoupon.coupon,
      })),
  };
}

export type TransactionUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type TransactionUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: TransactionForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: TransactionForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type TransactionUpdateParams = {
  transactionId: number;
  transaction: Transaction | null;
};

export class TransactionUpdateUsecase extends Usecase<
  TransactionUpdateState,
  TransactionUpdateAction,
  TransactionUpdateParams
> {
  params: TransactionUpdateParams;
  repository: TransactionRepository;

  constructor(
    repository: TransactionRepository,
    params: TransactionUpdateParams
  ) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): TransactionUpdateState {
    return {
      type: this.params.transaction !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values: this.params.transaction
        ? toFormValues(this.params.transaction)
        : {
            name: '',
            orderNumber: 0,
            transactionItems: [],
            transactionCoupons: [],
          },
    };
  }

  getNextState(
    state: TransactionUpdateState,
    action: TransactionUpdateAction
  ): TransactionUpdateState {
    return match([state, action])
      .returnType<TransactionUpdateState>()
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
        ([state, { values }]) => ({
          ...state,
          type: 'loaded',
          values,
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
        [{ type: 'submitError' }, { type: 'SUBMIT' }],
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
    state: TransactionUpdateState,
    dispatch: (action: TransactionUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchTransactionById(this.params.transactionId)
          .then((transaction) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: toFormValues(transaction),
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch transaction',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .updateTransaction(values, this.params.transactionId)
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
