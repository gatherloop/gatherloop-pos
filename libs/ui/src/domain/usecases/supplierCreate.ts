import { match } from 'ts-pattern';
import { SupplierForm } from '../entities';
import { SupplierRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: SupplierForm;
};

export type SupplierCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type SupplierCreateAction =
  | { type: 'SUBMIT'; values: SupplierForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class SupplierCreateUsecase extends Usecase<
  SupplierCreateState,
  SupplierCreateAction
> {
  params: undefined;
  repository: SupplierRepository;

  constructor(repository: SupplierRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): SupplierCreateState {
    const values: SupplierForm = {
      name: '',
      address: '',
      mapsLink: '',
      phone: '',
    };
    return {
      type: 'loaded',
      errorMessage: null,
      values,
    };
  }

  getNextState(
    state: SupplierCreateState,
    action: SupplierCreateAction
  ): SupplierCreateState {
    return match([state, action])
      .returnType<SupplierCreateState>()
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
    state: SupplierCreateState,
    dispatch: (action: SupplierCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createSupplier(values)
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
