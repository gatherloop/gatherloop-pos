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
  | { type: 'error' }
) &
  Context;

export type ChecklistSessionDetailAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; checklistSession: ChecklistSession }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'UPDATE_SESSION'; checklistSession: ChecklistSession };

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
        [{ type: 'loaded' }, { type: 'UPDATE_SESSION' }],
        ([state, { checklistSession }]) => ({
          ...state,
          checklistSession,
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
      .otherwise(() => {
        // noop
      });
  }
}
