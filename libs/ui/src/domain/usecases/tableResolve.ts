import { match } from 'ts-pattern';
import { PublicTable } from '../entities';
import { PublicTableRepository, TableNotFoundError } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  code: string | null;
  table: PublicTable | null;
  errorMessage: string | null;
};

// FR-4 in docs/prd-table-ordering.md. `noCode` is a distinct terminal state
// (not just "error") because landing on `/order` with no code at all is an
// expected, not exceptional, outcome (D17) — it never attempts a fetch.
export type TableResolveState = (
  | { type: 'noCode' }
  | { type: 'idle' }
  | { type: 'resolving' }
  | { type: 'resolved' }
  | { type: 'notFound' }
  | { type: 'error' }
) &
  Context;

export type TableResolveAction =
  | { type: 'FETCH' }
  | { type: 'RESOLVE_SUCCESS'; table: PublicTable }
  | { type: 'RESOLVE_NOT_FOUND' }
  | { type: 'RESOLVE_ERROR'; message: string };

export type TableResolveParams = {
  code: string | null;
};

export class TableResolveUsecase extends Usecase<
  TableResolveState,
  TableResolveAction,
  TableResolveParams
> {
  params: TableResolveParams;
  repository: PublicTableRepository;

  constructor(repository: PublicTableRepository, params: TableResolveParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): TableResolveState {
    const context: Context = {
      code: this.params.code,
      table: null,
      errorMessage: null,
    };

    if (this.params.code === null) {
      return { ...context, type: 'noCode' };
    }

    return { ...context, type: 'idle' };
  }

  getNextState(
    state: TableResolveState,
    action: TableResolveAction
  ): TableResolveState {
    return match([state, action])
      .returnType<TableResolveState>()
      .with(
        [{ type: 'idle' }, { type: 'FETCH' }],
        [{ type: 'error' }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'resolving', errorMessage: null })
      )
      .with(
        [{ type: 'resolving' }, { type: 'RESOLVE_SUCCESS' }],
        ([state, { table }]) => ({
          ...state,
          type: 'resolved',
          table,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'resolving' }, { type: 'RESOLVE_NOT_FOUND' }],
        ([state]) => ({ ...state, type: 'notFound', table: null })
      )
      .with(
        [{ type: 'resolving' }, { type: 'RESOLVE_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TableResolveState,
    dispatch: (action: TableResolveAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'resolving' }, ({ code }) => {
        this.repository
          .resolveTableByCode(code ?? '')
          .then((table) => dispatch({ type: 'RESOLVE_SUCCESS', table }))
          .catch((error) => {
            if (error instanceof TableNotFoundError) {
              dispatch({ type: 'RESOLVE_NOT_FOUND' });
            } else {
              dispatch({
                type: 'RESOLVE_ERROR',
                message: 'Failed to resolve table',
              });
            }
          });
      })
      .otherwise(() => {
        // No action needed for other states
      });
  }
}
