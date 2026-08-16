import { match, P } from 'ts-pattern';
import { Table } from '../entities';
import { TableRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  tables: Table[];
  errorMessage: string | null;
};

export type TableListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type TableListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; tables: Table[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE'; tables: Table[] }
  | { type: 'REVALIDATE_FINISH'; tables: Table[] };

export type TableListParams = {
  tables: Table[];
};

export class TableListUsecase extends Usecase<
  TableListState,
  TableListAction,
  TableListParams
> {
  params: TableListParams;
  repository: TableRepository;

  constructor(repository: TableRepository, params: TableListParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState() {
    const state: TableListState = {
      type: this.params.tables.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      tables: this.params.tables,
    };
    return state;
  }

  getNextState(state: TableListState, action: TableListAction) {
    return match([state, action])
      .returnType<TableListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { tables }]) => ({
          ...state,
          type: 'loaded',
          tables,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
        errorMessage: null,
      }))
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { tables }]) => ({
          ...state,
          type: 'loaded',
          tables,
          errorMessage: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TableListState,
    dispatch: (action: TableListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchTableList()
          .then((tables) => dispatch({ type: 'FETCH_SUCCESS', tables }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch tables',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ tables }) => {
        this.repository
          .fetchTableList()
          .then((tables) => dispatch({ type: 'REVALIDATE_FINISH', tables }))
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', tables }));
      })
      .otherwise(() => {
        // No action needed for other states
      });
  }
}
