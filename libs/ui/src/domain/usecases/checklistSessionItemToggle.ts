import { match } from 'ts-pattern';
import { ChecklistSessionItem } from '../entities';
import { ChecklistSessionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  itemId: number | null;
  errorMessage: string | null;
};

export type ChecklistSessionItemToggleState = (
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'unchecking' }
  | { type: 'toggleSuccess'; updatedItem: ChecklistSessionItem }
  | { type: 'toggleError' }
) &
  Context;

export type ChecklistSessionItemToggleAction =
  | { type: 'CHECK'; itemId: number }
  | { type: 'UNCHECK'; itemId: number }
  | { type: 'TOGGLE_SUCCESS'; updatedItem: ChecklistSessionItem }
  | { type: 'TOGGLE_ERROR'; errorMessage: string }
  | { type: 'RESET' };

export class ChecklistSessionItemToggleUsecase extends Usecase<
  ChecklistSessionItemToggleState,
  ChecklistSessionItemToggleAction
> {
  params: undefined;
  repository: ChecklistSessionRepository;

  constructor(repository: ChecklistSessionRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ChecklistSessionItemToggleState {
    return {
      type: 'idle',
      itemId: null,
      errorMessage: null,
    };
  }

  getNextState(
    state: ChecklistSessionItemToggleState,
    action: ChecklistSessionItemToggleAction
  ): ChecklistSessionItemToggleState {
    return match([state, action])
      .returnType<ChecklistSessionItemToggleState>()
      .with(
        [{ type: 'idle' }, { type: 'CHECK' }],
        ([state, { itemId }]) => ({ ...state, type: 'checking', itemId, errorMessage: null })
      )
      .with(
        [{ type: 'idle' }, { type: 'UNCHECK' }],
        ([state, { itemId }]) => ({ ...state, type: 'unchecking', itemId, errorMessage: null })
      )
      .with(
        [{ type: 'checking' }, { type: 'TOGGLE_SUCCESS' }],
        ([state, { updatedItem }]) => ({
          ...state,
          type: 'toggleSuccess',
          updatedItem,
        })
      )
      .with(
        [{ type: 'unchecking' }, { type: 'TOGGLE_SUCCESS' }],
        ([state, { updatedItem }]) => ({
          ...state,
          type: 'toggleSuccess',
          updatedItem,
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
        ([state]) => ({ ...state, type: 'idle', itemId: null })
      )
      .with(
        [{ type: 'toggleError' }, { type: 'RESET' }],
        ([state]) => ({ ...state, type: 'idle', itemId: null })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: ChecklistSessionItemToggleState,
    dispatch: (action: ChecklistSessionItemToggleAction) => void
  ): void {
    match(state)
      .with({ type: 'checking' }, ({ itemId }) => {
        if (itemId === null) return;
        this.repository
          .checkChecklistSessionItem(itemId)
          .then((updatedItem) =>
            dispatch({ type: 'TOGGLE_SUCCESS', updatedItem })
          )
          .catch(() =>
            dispatch({ type: 'TOGGLE_ERROR', errorMessage: 'Failed to check item' })
          );
      })
      .with({ type: 'unchecking' }, ({ itemId }) => {
        if (itemId === null) return;
        this.repository
          .uncheckChecklistSessionItem(itemId)
          .then((updatedItem) =>
            dispatch({ type: 'TOGGLE_SUCCESS', updatedItem })
          )
          .catch(() =>
            dispatch({ type: 'TOGGLE_ERROR', errorMessage: 'Failed to uncheck item' })
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
