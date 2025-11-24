import { match } from 'ts-pattern';
import { SupplierRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  supplierId: number | null;
};

export type SupplierDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type SupplierDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; supplierId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class SupplierDeleteUsecase extends Usecase<
  SupplierDeleteState,
  SupplierDeleteAction
> {
  params: undefined;
  repository: SupplierRepository;

  constructor(repository: SupplierRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): SupplierDeleteState {
    return {
      type: 'hidden',
      supplierId: null,
    };
  }
  getNextState(
    state: SupplierDeleteState,
    action: SupplierDeleteAction
  ): SupplierDeleteState {
    return match([state, action])
      .returnType<SupplierDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { supplierId }]) => ({ type: 'shown', supplierId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        type: 'hidden',
        supplierId: null,
      }))
      .with([{ type: 'shown' }, { type: 'DELETE' }], ([state]) => ({
        ...state,
        type: 'deleting',
      }))
      .with([{ type: 'deleting' }, { type: 'DELETE_ERROR' }], ([state]) => ({
        ...state,
        type: 'deletingError',
      }))
      .with(
        [{ type: 'deletingError' }, { type: 'DELETE_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'shown',
        })
      )
      .with([{ type: 'deleting' }, { type: 'DELETE_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'deletingSuccess',
      }))
      .with(
        [{ type: 'deletingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({
          ...state,
          type: 'hidden',
          SupplierId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: SupplierDeleteState,
    dispatch: (action: SupplierDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ supplierId }) => {
        this.repository
          .deleteSupplierById(supplierId ?? NaN)
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
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
