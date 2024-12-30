import { match } from 'ts-pattern';
import { MaterialForm } from '../entities';
import { MaterialRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: MaterialForm;
};

export type MaterialUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type MaterialUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: MaterialForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: MaterialForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class MaterialUpdateUsecase extends Usecase<
  MaterialUpdateState,
  MaterialUpdateAction
> {
  repository: MaterialRepository;

  constructor(repository: MaterialRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): MaterialUpdateState {
    const materialId = this.repository.getMaterialByIdServerParams();
    const material = materialId
      ? this.repository.getMaterialById(materialId)
      : null;
    const values: MaterialForm = {
      name: material?.name ?? '',
      price: material?.price ?? 0,
      unit: material?.unit ?? '',
      description: material?.description ?? '',
    };
    return {
      type: material !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values,
    };
  }

  getNextState(
    state: MaterialUpdateState,
    action: MaterialUpdateAction
  ): MaterialUpdateState {
    return match([state, action])
      .returnType<MaterialUpdateState>()
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
    state: MaterialUpdateState,
    dispatch: (action: MaterialUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        const materialId = this.repository.getMaterialByIdServerParams() ?? NaN;
        this.repository
          .fetchMaterialById(materialId)
          .then((material) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                name: material.name,
                price: material.price,
                unit: material.unit,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch material',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        const materialId = this.repository.getMaterialByIdServerParams() ?? NaN;
        this.repository
          .updateMaterial(values, materialId)
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
