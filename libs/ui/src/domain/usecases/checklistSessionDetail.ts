import { match } from 'ts-pattern';
import { ChecklistSession } from '../entities';
import { ChecklistSessionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  checklistSession: ChecklistSession | null;
  errorMessage: string | null;
};

export type ChecklistSessionDetailState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'revalidating' }
  | { type: 'error' }
  | { type: 'checkingItem'; itemId: number }
  | { type: 'uncheckingItem'; itemId: number }
  | { type: 'checkingSubItem'; subItemId: number }
  | { type: 'uncheckingSubItem'; subItemId: number }
) &
  Context;

export type ChecklistSessionDetailAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; checklistSession: ChecklistSession }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'REVALIDATE_SUCCESS'; checklistSession: ChecklistSession }
  | { type: 'REVALIDATE_ERROR' }
  | { type: 'CHECK_ITEM'; itemId: number }
  | { type: 'UNCHECK_ITEM'; itemId: number }
  | { type: 'CHECK_SUB_ITEM'; subItemId: number }
  | { type: 'UNCHECK_SUB_ITEM'; subItemId: number }
  | { type: 'TOGGLE_SUCCESS' }
  | { type: 'TOGGLE_ERROR'; errorMessage: string };

export type ChecklistSessionDetailParams = {
  checklistSessionId: number;
  checklistSession: ChecklistSession | null;
};

export class ChecklistSessionDetailUsecase extends Usecase<
  ChecklistSessionDetailState,
  ChecklistSessionDetailAction,
  ChecklistSessionDetailParams
> {
  params: ChecklistSessionDetailParams;
  repository: ChecklistSessionRepository;

  constructor(
    repository: ChecklistSessionRepository,
    params: ChecklistSessionDetailParams
  ) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): ChecklistSessionDetailState {
    return {
      type: this.params.checklistSession !== null ? 'loaded' : 'idle',
      checklistSession: this.params.checklistSession,
      errorMessage: null,
    };
  }

  getNextState(
    state: ChecklistSessionDetailState,
    action: ChecklistSessionDetailAction
  ): ChecklistSessionDetailState {
    return match([state, action])
      .returnType<ChecklistSessionDetailState>()
      .with([{ type: 'idle' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
        errorMessage: null,
      }))
      .with([{ type: 'error' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
        errorMessage: null,
      }))
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { checklistSession }]) => ({
          ...state,
          type: 'loaded',
          checklistSession,
          errorMessage: null,
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
        [{ type: 'loaded' }, { type: 'CHECK_ITEM' }],
        ([state, { itemId }]) => ({
          ...state,
          type: 'checkingItem',
          itemId,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'UNCHECK_ITEM' }],
        ([state, { itemId }]) => ({
          ...state,
          type: 'uncheckingItem',
          itemId,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'CHECK_SUB_ITEM' }],
        ([state, { subItemId }]) => ({
          ...state,
          type: 'checkingSubItem',
          subItemId,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'UNCHECK_SUB_ITEM' }],
        ([state, { subItemId }]) => ({
          ...state,
          type: 'uncheckingSubItem',
          subItemId,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'checkingItem' }, { type: 'TOGGLE_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'revalidating',
        })
      )
      .with(
        [{ type: 'uncheckingItem' }, { type: 'TOGGLE_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'revalidating',
        })
      )
      .with(
        [{ type: 'checkingSubItem' }, { type: 'TOGGLE_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'revalidating',
        })
      )
      .with(
        [{ type: 'uncheckingSubItem' }, { type: 'TOGGLE_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'revalidating',
        })
      )
      .with(
        [{ type: 'checkingItem' }, { type: 'TOGGLE_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'loaded',
          errorMessage,
        })
      )
      .with(
        [{ type: 'uncheckingItem' }, { type: 'TOGGLE_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'loaded',
          errorMessage,
        })
      )
      .with(
        [{ type: 'checkingSubItem' }, { type: 'TOGGLE_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'loaded',
          errorMessage,
        })
      )
      .with(
        [{ type: 'uncheckingSubItem' }, { type: 'TOGGLE_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'loaded',
          errorMessage,
        })
      )
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_SUCCESS' }],
        ([state, { checklistSession }]) => ({
          ...state,
          type: 'loaded',
          checklistSession,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_ERROR' }],
        ([state]) => ({
          ...state,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: ChecklistSessionDetailState,
    dispatch: (action: ChecklistSessionDetailAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchChecklistSessionById(this.params.checklistSessionId)
          .then((checklistSession) =>
            dispatch({ type: 'FETCH_SUCCESS', checklistSession })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch checklist session',
            })
          );
      })
      .with({ type: 'revalidating' }, () => {
        this.repository
          .fetchChecklistSessionById(this.params.checklistSessionId)
          .then((checklistSession) =>
            dispatch({ type: 'REVALIDATE_SUCCESS', checklistSession })
          )
          .catch(() => dispatch({ type: 'REVALIDATE_ERROR' }));
      })
      .with({ type: 'checkingItem' }, ({ itemId }) => {
        this.repository
          .checkChecklistSessionItem(itemId)
          .then(() => dispatch({ type: 'TOGGLE_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'TOGGLE_ERROR',
              errorMessage: 'Failed to check item',
            })
          );
      })
      .with({ type: 'uncheckingItem' }, ({ itemId }) => {
        this.repository
          .uncheckChecklistSessionItem(itemId)
          .then(() => dispatch({ type: 'TOGGLE_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'TOGGLE_ERROR',
              errorMessage: 'Failed to uncheck item',
            })
          );
      })
      .with({ type: 'checkingSubItem' }, ({ subItemId }) => {
        this.repository
          .checkChecklistSessionSubItem(subItemId)
          .then(() => dispatch({ type: 'TOGGLE_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'TOGGLE_ERROR',
              errorMessage: 'Failed to check sub item',
            })
          );
      })
      .with({ type: 'uncheckingSubItem' }, ({ subItemId }) => {
        this.repository
          .uncheckChecklistSessionSubItem(subItemId)
          .then(() => dispatch({ type: 'TOGGLE_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'TOGGLE_ERROR',
              errorMessage: 'Failed to uncheck sub item',
            })
          );
      })
      .otherwise(() => {
        // noop
      });
  }
}
