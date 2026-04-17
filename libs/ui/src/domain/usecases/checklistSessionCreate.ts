import { match } from 'ts-pattern';
import { ChecklistSession, ChecklistSessionForm } from '../entities';
import { ChecklistSessionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: ChecklistSessionForm;
};

export type ChecklistSessionCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess'; checklistSession: ChecklistSession }
  | { type: 'submitError' }
  | { type: 'duplicateError'; checklistSession: ChecklistSession }
) &
  Context;

export type ChecklistSessionCreateAction =
  | { type: 'SUBMIT'; values: ChecklistSessionForm }
  | { type: 'SUBMIT_SUCCESS'; checklistSession: ChecklistSession }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' }
  | { type: 'DUPLICATE_ERROR'; checklistSession: ChecklistSession };

export type ChecklistSessionCreateParams = {
  checklistTemplateId?: number;
  date?: string;
};

export class ChecklistSessionCreateUsecase extends Usecase<
  ChecklistSessionCreateState,
  ChecklistSessionCreateAction,
  ChecklistSessionCreateParams
> {
  params: ChecklistSessionCreateParams;
  repository: ChecklistSessionRepository;

  constructor(
    repository: ChecklistSessionRepository,
    params: ChecklistSessionCreateParams = {}
  ) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): ChecklistSessionCreateState {
    const today = new Date().toISOString().split('T')[0];
    const values: ChecklistSessionForm = {
      checklistTemplateId: this.params.checklistTemplateId ?? 0,
      date: this.params.date ?? today,
    };
    return {
      type: 'loaded',
      errorMessage: null,
      values,
    };
  }

  getNextState(
    state: ChecklistSessionCreateState,
    action: ChecklistSessionCreateAction
  ): ChecklistSessionCreateState {
    return match([state, action])
      .returnType<ChecklistSessionCreateState>()
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
        ([state, { checklistSession }]) => ({
          ...state,
          type: 'submitSuccess',
          checklistSession,
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
        [{ type: 'submitting' }, { type: 'DUPLICATE_ERROR' }],
        ([state, { checklistSession }]) => ({
          ...state,
          type: 'duplicateError',
          checklistSession,
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
    state: ChecklistSessionCreateState,
    dispatch: (action: ChecklistSessionCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createChecklistSession(values)
          .then((checklistSession) =>
            dispatch({ type: 'SUBMIT_SUCCESS', checklistSession })
          )
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
