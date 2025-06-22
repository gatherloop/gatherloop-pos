import { match } from 'ts-pattern';
import { MaterialForm } from '../entities';
import { MaterialRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: MaterialForm;
};

export type MaterialCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type MaterialCreateAction =
  | { type: 'SUBMIT'; values: MaterialForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class MaterialCreateUsecase extends Usecase<
  MaterialCreateState,
  MaterialCreateAction
> {
  params: undefined;
  repository: MaterialRepository;

  constructor(repository: MaterialRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): MaterialCreateState {
    const values: MaterialForm = {
      name: '',
      price: 0,
      unit: '',
      description: '',
    };
    return {
      type: 'loaded',
      errorMessage: null,
      values,
    };
  }

  getNextState(
    state: MaterialCreateState,
    action: MaterialCreateAction
  ): MaterialCreateState {
    return match([state, action])
      .returnType<MaterialCreateState>()
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
    state: MaterialCreateState,
    dispatch: (action: MaterialCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createMaterial(values)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .with({ type: 'submitError' }, () => {
        dispatch({ type: 'SUBMIT_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
