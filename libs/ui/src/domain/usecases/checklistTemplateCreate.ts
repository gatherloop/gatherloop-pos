import { match } from 'ts-pattern';
import { ChecklistTemplateForm } from '../entities';
import { ChecklistTemplateRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: ChecklistTemplateForm;
};

export type ChecklistTemplateCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type ChecklistTemplateCreateAction =
  | { type: 'SUBMIT'; values: ChecklistTemplateForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class ChecklistTemplateCreateUsecase extends Usecase<
  ChecklistTemplateCreateState,
  ChecklistTemplateCreateAction
> {
  params: undefined;
  repository: ChecklistTemplateRepository;

  constructor(repository: ChecklistTemplateRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ChecklistTemplateCreateState {
    const values: ChecklistTemplateForm = {
      name: '',
      description: '',
      items: [],
    };
    return {
      type: 'loaded',
      errorMessage: null,
      values,
    };
  }

  getNextState(
    state: ChecklistTemplateCreateState,
    action: ChecklistTemplateCreateAction
  ): ChecklistTemplateCreateState {
    return match([state, action])
      .returnType<ChecklistTemplateCreateState>()
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
    state: ChecklistTemplateCreateState,
    dispatch: (action: ChecklistTemplateCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createChecklistTemplate(values)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'SUBMIT_ERROR',
              errorMessage: 'Submit failed',
            })
          );
      })
      .otherwise(() => {
        // noop
      });
  }
}
