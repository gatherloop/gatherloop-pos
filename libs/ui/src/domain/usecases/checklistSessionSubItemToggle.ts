import { match } from 'ts-pattern';
import { ChecklistSessionSubItem } from '../entities';
import { ChecklistSessionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  subItemId: number | null;
  errorMessage: string | null;
};

export type ChecklistSessionSubItemToggleState = (
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'unchecking' }
  | { type: 'toggleSuccess'; updatedSubItem: ChecklistSessionSubItem }
  | { type: 'toggleError' }
) &
  Context;

export type ChecklistSessionSubItemToggleAction =
  | { type: 'CHECK'; subItemId: number }
  | { type: 'UNCHECK'; subItemId: number }
  | { type: 'TOGGLE_SUCCESS'; updatedSubItem: ChecklistSessionSubItem }
  | { type: 'TOGGLE_ERROR'; errorMessage: string }
  | { type: 'RESET' };

export class ChecklistSessionSubItemToggleUsecase extends Usecase<
  ChecklistSessionSubItemToggleState,
  ChecklistSessionSubItemToggleAction
> {
  params: undefined;
  repository: ChecklistSessionRepository;

  constructor(repository: ChecklistSessionRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ChecklistSessionSubItemToggleState {
    return {
      type: 'idle',
      subItemId: null,
      errorMessage: null,
    };
  }

  getNextState(
    state: ChecklistSessionSubItemToggleState,
    action: ChecklistSessionSubItemToggleAction
  ): ChecklistSessionSubItemToggleState {
    return match([state, action])
      .returnType<ChecklistSessionSubItemToggleState>()
      .with(
        [{ type: 'idle' }, { type: 'CHECK' }],
        ([state, { subItemId }]) => ({
          ...state,
          type: 'checking',
          subItemId,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'idle' }, { type: 'UNCHECK' }],
        ([state, { subItemId }]) => ({
          ...state,
          type: 'unchecking',
          subItemId,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'checking' }, { type: 'TOGGLE_SUCCESS' }],
        ([state, { updatedSubItem }]) => ({
          ...state,
          type: 'toggleSuccess',
          updatedSubItem,
        })
      )
      .with(
        [{ type: 'unchecking' }, { type: 'TOGGLE_SUCCESS' }],
        ([state, { updatedSubItem }]) => ({
          ...state,
          type: 'toggleSuccess',
          updatedSubItem,
        })
      )
      .with(
        [{ type: 'checking' }, { type: 'TOGGLE_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'toggleError',
          errorMessage,
        })
      )
      .with(
        [{ type: 'unchecking' }, { type: 'TOGGLE_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'toggleError',
          errorMessage,
        })
      )
      .with(
        [{ type: 'toggleSuccess' }, { type: 'RESET' }],
        ([state]) => ({ ...state, type: 'idle', subItemId: null })
      )
      .with(
        [{ type: 'toggleError' }, { type: 'RESET' }],
        ([state]) => ({ ...state, type: 'idle', subItemId: null })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: ChecklistSessionSubItemToggleState,
    dispatch: (action: ChecklistSessionSubItemToggleAction) => void
  ): void {
    match(state)
      .with({ type: 'checking' }, ({ subItemId }) => {
        if (subItemId === null) return;
        this.repository
          .checkChecklistSessionSubItem(subItemId)
          .then((updatedSubItem) =>
            dispatch({ type: 'TOGGLE_SUCCESS', updatedSubItem })
          )
          .catch(() =>
            dispatch({
              type: 'TOGGLE_ERROR',
              errorMessage: 'Failed to check sub item',
            })
          );
      })
      .with({ type: 'unchecking' }, ({ subItemId }) => {
        if (subItemId === null) return;
        this.repository
          .uncheckChecklistSessionSubItem(subItemId)
          .then((updatedSubItem) =>
            dispatch({ type: 'TOGGLE_SUCCESS', updatedSubItem })
          )
          .catch(() =>
            dispatch({
              type: 'TOGGLE_ERROR',
              errorMessage: 'Failed to uncheck sub item',
            })
          );
      })
      .with({ type: 'toggleSuccess' }, () => {
        dispatch({ type: 'RESET' });
      })
      .with({ type: 'toggleError' }, () => {
        dispatch({ type: 'RESET' });
      })
      .otherwise(() => {
        // noop
      });
  }
}
