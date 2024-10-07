import { match } from 'ts-pattern';
import { CategoryForm } from '../entities';
import { CategoryRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: CategoryForm;
};

export type CategoryCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
) &
  Context;

export type CategoryCreateAction =
  | { type: 'SUBMIT'; values: CategoryForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string };

export class CategoryCreateUsecase extends Usecase<
  CategoryCreateState,
  CategoryCreateAction
> {
  repository: CategoryRepository;

  constructor(repository: CategoryRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): CategoryCreateState {
    return {
      type: 'loaded',
      errorMessage: null,
      values: {
        name: '',
      },
    };
  }

  getNextState(
    state: CategoryCreateState,
    action: CategoryCreateAction
  ): CategoryCreateState {
    return match([state, action])
      .returnType<CategoryCreateState>()
      .with(
        [{ type: 'loaded' }, { type: 'SUBMIT' }],
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
          type: 'loaded',
          errorMessage,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: CategoryCreateState,
    dispatch: (action: CategoryCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createCategory(values)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
