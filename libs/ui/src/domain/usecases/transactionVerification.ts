import { match, P } from 'ts-pattern';
import { TransactionVerification } from '../entities';
import {
  TransactionRepository,
  TransactionVerificationNotFoundError,
} from '../repositories';
import { Usecase } from './IUsecase';

const FETCH_ERROR_MESSAGE = 'Failed to load the verification photo';
const APPROVE_ERROR_MESSAGE = 'Failed to approve the order';
const REJECT_ERROR_MESSAGE = 'Failed to reject the order';

type Context = {
  transactionId: number | null;
  verification: TransactionVerification | null;
  errorMessage: string | null;
};

export type TransactionVerificationState = (
  | { type: 'hidden' }
  | { type: 'loading' }
  | { type: 'shown' }
  | { type: 'approving' }
  | { type: 'confirmingReject' }
  | { type: 'rejecting' }
  | { type: 'success' }
  | { type: 'gone' }
  | { type: 'error' }
) &
  Context;

export type TransactionVerificationAction =
  | { type: 'SHOW'; transactionId: number }
  | { type: 'HIDE' }
  | { type: 'FETCH_SUCCESS'; verification: TransactionVerification }
  | { type: 'FETCH_NOT_FOUND' }
  | { type: 'FETCH_ERROR' }
  | { type: 'APPROVE' }
  | { type: 'APPROVE_SUCCESS' }
  | { type: 'APPROVE_ERROR' }
  | { type: 'CONFIRM_REJECT' }
  | { type: 'CANCEL_REJECT' }
  | { type: 'REJECT' }
  | { type: 'REJECT_SUCCESS' }
  | { type: 'REJECT_ERROR' };

export class TransactionVerificationUsecase extends Usecase<
  TransactionVerificationState,
  TransactionVerificationAction
> {
  params: undefined;
  repository: TransactionRepository;

  constructor(repository: TransactionRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TransactionVerificationState {
    return {
      type: 'hidden',
      transactionId: null,
      verification: null,
      errorMessage: null,
    };
  }

  getNextState(
    state: TransactionVerificationState,
    action: TransactionVerificationAction
  ): TransactionVerificationState {
    return match([state, action])
      .returnType<TransactionVerificationState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW' }],
        ([state, { transactionId }]) => ({
          ...state,
          type: 'loading',
          transactionId,
          verification: null,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { verification }]) => ({
          ...state,
          type: 'shown',
          verification,
        })
      )
      .with([{ type: 'loading' }, { type: 'FETCH_NOT_FOUND' }], ([state]) => ({
        ...state,
        type: 'gone',
      }))
      .with([{ type: 'loading' }, { type: 'FETCH_ERROR' }], ([state]) => ({
        ...state,
        type: 'error',
        errorMessage: FETCH_ERROR_MESSAGE,
      }))
      .with([{ type: 'shown' }, { type: 'APPROVE' }], ([state]) => ({
        ...state,
        type: 'approving',
      }))
      .with(
        [{ type: 'approving' }, { type: 'APPROVE_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'success',
        })
      )
      .with([{ type: 'approving' }, { type: 'APPROVE_ERROR' }], ([state]) => ({
        ...state,
        type: 'error',
        errorMessage: APPROVE_ERROR_MESSAGE,
      }))
      .with([{ type: 'shown' }, { type: 'CONFIRM_REJECT' }], ([state]) => ({
        ...state,
        type: 'confirmingReject',
      }))
      .with(
        [{ type: 'confirmingReject' }, { type: 'CANCEL_REJECT' }],
        ([state]) => ({
          ...state,
          type: 'shown',
        })
      )
      .with([{ type: 'confirmingReject' }, { type: 'REJECT' }], ([state]) => ({
        ...state,
        type: 'rejecting',
      }))
      .with(
        [{ type: 'rejecting' }, { type: 'REJECT_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'success',
        })
      )
      .with([{ type: 'rejecting' }, { type: 'REJECT_ERROR' }], ([state]) => ({
        ...state,
        type: 'error',
        errorMessage: REJECT_ERROR_MESSAGE,
      }))
      .with(
        [
          {
            type: P.union(
              'shown',
              'confirmingReject',
              'gone',
              'error',
              'success'
            ),
          },
          { type: 'HIDE' },
        ],
        ([state]) => ({
          ...state,
          type: 'hidden',
          transactionId: null,
          verification: null,
          errorMessage: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionVerificationState,
    dispatch: (action: TransactionVerificationAction) => void
  ): void {
    match(state)
      .with({ type: 'loading' }, ({ transactionId }) => {
        this.repository
          .fetchTransactionVerification(transactionId ?? NaN)
          .then((verification) =>
            dispatch({ type: 'FETCH_SUCCESS', verification })
          )
          .catch((error) => {
            if (error instanceof TransactionVerificationNotFoundError) {
              dispatch({ type: 'FETCH_NOT_FOUND' });
            } else {
              dispatch({ type: 'FETCH_ERROR' });
            }
          });
      })
      .with({ type: 'approving' }, ({ transactionId }) => {
        this.repository
          .approveTransactionVerification(transactionId ?? NaN)
          .then(() => dispatch({ type: 'APPROVE_SUCCESS' }))
          .catch(() => dispatch({ type: 'APPROVE_ERROR' }));
      })
      .with({ type: 'rejecting' }, ({ transactionId }) => {
        this.repository
          .rejectTransactionVerification(transactionId ?? NaN)
          .then(() => dispatch({ type: 'REJECT_SUCCESS' }))
          .catch(() => dispatch({ type: 'REJECT_ERROR' }));
      })
      .with({ type: 'success' }, () => {
        dispatch({ type: 'HIDE' });
      })
      .otherwise(() => {
        // No action needed for other states
      });
  }
}
