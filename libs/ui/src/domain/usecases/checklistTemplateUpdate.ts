import { match } from 'ts-pattern';
import { ChecklistTemplate, ChecklistTemplateForm } from '../entities';
import { ChecklistTemplateRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: ChecklistTemplateForm;
};

export type ChecklistTemplateUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type ChecklistTemplateUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: ChecklistTemplateForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: ChecklistTemplateForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type ChecklistTemplateUpdateParams = {
  checklistTemplateId: number;
  checklistTemplate: ChecklistTemplate | null;
};

export class ChecklistTemplateUpdateUsecase extends Usecase<
  ChecklistTemplateUpdateState,
  ChecklistTemplateUpdateAction,
  ChecklistTemplateUpdateParams
> {
  params: ChecklistTemplateUpdateParams;
  repository: ChecklistTemplateRepository;

  constructor(
    repository: ChecklistTemplateRepository,
    params: ChecklistTemplateUpdateParams
  ) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): ChecklistTemplateUpdateState {
    const t = this.params.checklistTemplate;
    const values: ChecklistTemplateForm = {
      name: t?.name ?? '',
      description: t?.description ?? '',
      items:
        t?.items.map((item) => ({
          name: item.name,
          description: item.description ?? '',
          displayOrder: item.displayOrder,
          subItems: item.subItems.map((sub) => ({
            name: sub.name,
            displayOrder: sub.displayOrder,
          })),
        })) ?? [],
    };

    return {
      type: t !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values,
    };
  }

  getNextState(
    state: ChecklistTemplateUpdateState,
    action: ChecklistTemplateUpdateAction
  ): ChecklistTemplateUpdateState {
    return match([state, action])
      .returnType<ChecklistTemplateUpdateState>()
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
    state: ChecklistTemplateUpdateState,
    dispatch: (action: ChecklistTemplateUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        const checklistTemplateId = this.params.checklistTemplateId;
        this.repository
          .fetchChecklistTemplateById(checklistTemplateId)
          .then((t) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                name: t.name,
                description: t.description ?? '',
                items: t.items.map((item) => ({
                  name: item.name,
                  description: item.description ?? '',
                  displayOrder: item.displayOrder,
                  subItems: item.subItems.map((sub) => ({
                    name: sub.name,
                    displayOrder: sub.displayOrder,
                  })),
                })),
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch checklist template',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        const checklistTemplateId = this.params.checklistTemplateId;
        this.repository
          .updateChecklistTemplate(values, checklistTemplateId)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({
              type: 'SUBMIT_ERROR',
              errorMessage: 'Submit failed',
            })
          );
      })
      .with({ type: 'submitError' }, () => {
        dispatch({ type: 'SUBMIT_CANCEL' });
      })
      .otherwise(() => {
        // noop
      });
  }
}
