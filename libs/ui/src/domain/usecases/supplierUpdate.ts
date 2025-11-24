import { match } from 'ts-pattern';
import { Supplier, SupplierForm } from '../entities';
import { SupplierRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: SupplierForm;
};

export type SupplierUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type SupplierUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: SupplierForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: SupplierForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type SupplierUpdateParams = {
  supplierId: number;
  supplier: Supplier | null;
};

export class SupplierUpdateUsecase extends Usecase<
  SupplierUpdateState,
  SupplierUpdateAction,
  SupplierUpdateParams
> {
  params: SupplierUpdateParams;
  repository: SupplierRepository;

  constructor(repository: SupplierRepository, params: SupplierUpdateParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): SupplierUpdateState {
    const values: SupplierForm = {
      name: this.params.supplier?.name ?? '',
      phone: this.params.supplier?.phone ?? '',
      address: this.params.supplier?.address ?? '',
      mapsLink: this.params.supplier?.mapsLink ?? '',
    };

    return {
      type: this.params.supplier !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values,
    };
  }

  getNextState(
    state: SupplierUpdateState,
    action: SupplierUpdateAction
  ): SupplierUpdateState {
    return match([state, action])
      .returnType<SupplierUpdateState>()
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
    state: SupplierUpdateState,
    dispatch: (action: SupplierUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        const supplierId = this.params.supplierId;
        this.repository
          .fetchSupplierById(supplierId)
          .then((supplier) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                name: supplier.name,
                address: supplier.address,
                mapsLink: supplier.mapsLink,
                phone: supplier.phone,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch supplier',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        const supplierId = this.params.supplierId;
        this.repository
          .updateSupplier(values, supplierId)
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
