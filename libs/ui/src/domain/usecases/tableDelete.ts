import { match } from 'ts-pattern';
import { TableRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  tableId: number | null;
};

export type TableDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type TableDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; tableId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class TableDeleteUsecase extends Usecase<
  TableDeleteState,
  TableDeleteAction
> {
  params: undefined;
  repository: TableRepository;

  constructor(repository: TableRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TableDeleteState {
    return {
      type: 'hidden',
      tableId: null,
    };
  }
  getNextState(
    state: TableDeleteState,
    action: TableDeleteAction
  ): TableDeleteState {
    return match([state, action])
      .returnType<TableDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { tableId }]) => ({ type: 'shown', tableId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        tableId: null,
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
          tableId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: TableDeleteState,
    dispatch: (action: TableDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ tableId }) => {
        this.repository
          .deleteTableById(tableId ?? NaN)
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
