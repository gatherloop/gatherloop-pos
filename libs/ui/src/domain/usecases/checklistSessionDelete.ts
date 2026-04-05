import { match } from 'ts-pattern';
import { ChecklistSessionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  checklistSessionId: number | null;
};

export type ChecklistSessionDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type ChecklistSessionDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; checklistSessionId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class ChecklistSessionDeleteUsecase extends Usecase<
  ChecklistSessionDeleteState,
  ChecklistSessionDeleteAction
> {
  params: undefined;
  repository: ChecklistSessionRepository;

  constructor(repository: ChecklistSessionRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ChecklistSessionDeleteState {
    return {
      type: 'hidden',
      checklistSessionId: null,
    };
  }

  getNextState(
    state: ChecklistSessionDeleteState,
    action: ChecklistSessionDeleteAction
  ): ChecklistSessionDeleteState {
    return match([state, action])
      .returnType<ChecklistSessionDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { checklistSessionId }]) => ({
          type: 'shown',
          checklistSessionId,
        })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], () => ({
        type: 'hidden',
        checklistSessionId: null,
      }))
      .with([{ type: 'shown' }, { type: 'DELETE' }], ([state]) => ({
        ...state,
        type: 'deleting',
      }))
      .with(
        [{ type: 'deleting' }, { type: 'DELETE_ERROR' }],
        ([state]) => ({
          ...state,
          type: 'deletingError',
        })
      )
      .with(
        [{ type: 'deletingError' }, { type: 'DELETE_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'shown',
        })
      )
      .with(
        [{ type: 'deleting' }, { type: 'DELETE_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'deletingSuccess',
        })
      )
      .with(
        [{ type: 'deletingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        () => ({
          type: 'hidden',
          checklistSessionId: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: ChecklistSessionDeleteState,
    dispatch: (action: ChecklistSessionDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ checklistSessionId }) => {
        this.repository
          .deleteChecklistSessionById(checklistSessionId ?? NaN)
          .then(() => dispatch({ type: 'DELETE_SUCCESS' }))
          .catch(() => dispatch({ type: 'DELETE_ERROR' }));
      })
      .with({ type: 'deletingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'deletingError' }, () => {
        dispatch({ type: 'DELETE_CANCEL' });
      })
      .otherwise(() => {
        // noop
      });
  }
}
