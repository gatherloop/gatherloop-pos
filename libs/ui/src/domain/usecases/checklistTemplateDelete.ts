import { match } from 'ts-pattern';
import { ChecklistTemplateRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  checklistTemplateId: number | null;
};

export type ChecklistTemplateDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type ChecklistTemplateDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; checklistTemplateId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class ChecklistTemplateDeleteUsecase extends Usecase<
  ChecklistTemplateDeleteState,
  ChecklistTemplateDeleteAction
> {
  params: undefined;
  repository: ChecklistTemplateRepository;

  constructor(repository: ChecklistTemplateRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ChecklistTemplateDeleteState {
    return {
      type: 'hidden',
      checklistTemplateId: null,
    };
  }

  getNextState(
    state: ChecklistTemplateDeleteState,
    action: ChecklistTemplateDeleteAction
  ): ChecklistTemplateDeleteState {
    return match([state, action])
      .returnType<ChecklistTemplateDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { checklistTemplateId }]) => ({
          type: 'shown',
          checklistTemplateId,
        })
      )
      .with(
        [{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }],
        () => ({
          type: 'hidden',
          checklistTemplateId: null,
        })
      )
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
          checklistTemplateId: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: ChecklistTemplateDeleteState,
    dispatch: (action: ChecklistTemplateDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ checklistTemplateId }) => {
        this.repository
          .deleteChecklistTemplateById(checklistTemplateId ?? NaN)
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
