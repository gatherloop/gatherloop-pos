import { match } from 'ts-pattern';
import { Table } from '../entities';
import { TableRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  tableId: number | null;
  table: Table | null;
};

export type TableRegenerateCodeState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'regenerating' }
  | { type: 'regeneratingSuccess' }
  | { type: 'regeneratingError' }
) &
  Context;

export type TableRegenerateCodeAction =
  | { type: 'SHOW_CONFIRMATION'; tableId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'REGENERATE' }
  | { type: 'REGENERATE_SUCCESS'; table: Table }
  | { type: 'REGENERATE_ERROR' }
  | { type: 'REGENERATE_CANCEL' };

// Regenerating a table's code invalidates any QR sticker printed for the
// previous one (D6) — this is the "rotate a leaked code" mechanism, so it is
// modeled as a confirmable action rather than a plain button, same shape as
// TableDeleteUsecase.
export class TableRegenerateCodeUsecase extends Usecase<
  TableRegenerateCodeState,
  TableRegenerateCodeAction
> {
  params: undefined;
  repository: TableRepository;

  constructor(repository: TableRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TableRegenerateCodeState {
    return {
      type: 'hidden',
      tableId: null,
      table: null,
    };
  }

  getNextState(
    state: TableRegenerateCodeState,
    action: TableRegenerateCodeAction
  ): TableRegenerateCodeState {
    return match([state, action])
      .returnType<TableRegenerateCodeState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([state, { tableId }]) => ({ ...state, type: 'shown', tableId })
      )
      .with(
        [{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({ ...state, type: 'hidden', tableId: null })
      )
      .with([{ type: 'shown' }, { type: 'REGENERATE' }], ([state]) => ({
        ...state,
        type: 'regenerating',
      }))
      .with(
        [{ type: 'regenerating' }, { type: 'REGENERATE_ERROR' }],
        ([state]) => ({ ...state, type: 'regeneratingError' })
      )
      .with(
        [{ type: 'regeneratingError' }, { type: 'REGENERATE_CANCEL' }],
        ([state]) => ({ ...state, type: 'shown' })
      )
      .with(
        [{ type: 'regenerating' }, { type: 'REGENERATE_SUCCESS' }],
        ([state, { table }]) => ({
          ...state,
          type: 'regeneratingSuccess',
          table,
        })
      )
      .with(
        [{ type: 'regeneratingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({ ...state, type: 'hidden', tableId: null })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TableRegenerateCodeState,
    dispatch: (action: TableRegenerateCodeAction) => void
  ): void {
    match(state)
      .with({ type: 'regenerating' }, ({ tableId }) => {
        this.repository
          .regenerateTableCode(tableId ?? NaN)
          .then((table) => dispatch({ type: 'REGENERATE_SUCCESS', table }))
          .catch(() => dispatch({ type: 'REGENERATE_ERROR' }));
      })
      .with({ type: 'regeneratingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'regeneratingError' }, () => {
        dispatch({ type: 'REGENERATE_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
