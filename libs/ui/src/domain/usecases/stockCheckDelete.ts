import { match } from 'ts-pattern';
import { StockCheckRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  stockCheckId: number | null;
};

export type StockCheckDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type StockCheckDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; stockCheckId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class StockCheckDeleteUsecase extends Usecase<
  StockCheckDeleteState,
  StockCheckDeleteAction
> {
  params: undefined;
  repository: StockCheckRepository;

  constructor(repository: StockCheckRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): StockCheckDeleteState {
    return { type: 'hidden', stockCheckId: null };
  }

  getNextState(
    state: StockCheckDeleteState,
    action: StockCheckDeleteAction
  ): StockCheckDeleteState {
    return match([state, action])
      .returnType<StockCheckDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([, { stockCheckId }]) => ({ type: 'shown', stockCheckId })
      )
      .with(
        [{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }],
        () => ({ type: 'hidden', stockCheckId: null })
      )
      .with(
        [{ type: 'shown' }, { type: 'DELETE' }],
        ([state]) => ({ ...state, type: 'deleting' })
      )
      .with(
        [{ type: 'deleting' }, { type: 'DELETE_ERROR' }],
        ([state]) => ({ ...state, type: 'deletingError' })
      )
      .with(
        [{ type: 'deletingError' }, { type: 'DELETE_CANCEL' }],
        ([state]) => ({ ...state, type: 'shown' })
      )
      .with(
        [{ type: 'deleting' }, { type: 'DELETE_SUCCESS' }],
        ([state]) => ({ ...state, type: 'deletingSuccess' })
      )
      .with(
        [{ type: 'deletingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        () => ({ type: 'hidden', stockCheckId: null })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: StockCheckDeleteState,
    dispatch: (action: StockCheckDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ stockCheckId }) => {
        this.repository
          .deleteStockCheckById(stockCheckId ?? NaN)
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
        // noop
      });
  }
}
