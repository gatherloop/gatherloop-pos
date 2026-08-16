import { match } from 'ts-pattern';
import { Table, TableForm } from '../entities';
import { TableRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: TableForm;
  table: Table | null;
};

export type TableUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type TableUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; table: Table }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: TableForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type TableUpdateParams = {
  tableId: number;
  table: Table | null;
};

export class TableUpdateUsecase extends Usecase<
  TableUpdateState,
  TableUpdateAction,
  TableUpdateParams
> {
  params: TableUpdateParams;
  repository: TableRepository;

  constructor(repository: TableRepository, params: TableUpdateParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): TableUpdateState {
    return {
      type: this.params.table !== null ? 'loaded' : 'idle',
      errorMessage: null,
      table: this.params.table,
      values: {
        label: this.params.table?.label ?? '',
      },
    };
  }

  getNextState(
    state: TableUpdateState,
    action: TableUpdateAction
  ): TableUpdateState {
    return match([state, action])
      .returnType<TableUpdateState>()
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
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { table }]) => ({
          ...state,
          type: 'loaded',
          table,
          values: { label: table.label },
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
    state: TableUpdateState,
    dispatch: (action: TableUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchTableById(this.params.tableId)
          .then((table) => dispatch({ type: 'FETCH_SUCCESS', table }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch table',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .updateTable(values, this.params.tableId)
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
