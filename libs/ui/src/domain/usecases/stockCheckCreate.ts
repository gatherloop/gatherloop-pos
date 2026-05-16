import { match } from 'ts-pattern';
import { StockCheckForm, StockCheckItemForm } from '../entities';
import { StockCheckRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: StockCheckForm;
};

export type StockCheckCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type StockCheckCreateAction =
  | { type: 'SUBMIT'; values: StockCheckForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type StockCheckCreateParams = {
  items: StockCheckItemForm[];
};

export class StockCheckCreateUsecase extends Usecase<
  StockCheckCreateState,
  StockCheckCreateAction,
  StockCheckCreateParams
> {
  params: StockCheckCreateParams;
  repository: StockCheckRepository;

  constructor(repository: StockCheckRepository, params: StockCheckCreateParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): StockCheckCreateState {
    return {
      type: 'loaded',
      errorMessage: null,
      values: { items: this.params.items },
    };
  }

  getNextState(
    state: StockCheckCreateState,
    action: StockCheckCreateAction
  ): StockCheckCreateState {
    return match([state, action])
      .returnType<StockCheckCreateState>()
      .with(
        [{ type: 'loaded' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({ ...state, values, type: 'submitting' })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({ ...state, values, type: 'submitting' })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_SUCCESS' }],
        ([state]) => ({ ...state, type: 'submitSuccess' })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_ERROR' }],
        ([state, { errorMessage }]) => ({ ...state, type: 'submitError', errorMessage })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT_CANCEL' }],
        ([state]) => ({ ...state, type: 'loaded' })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: StockCheckCreateState,
    dispatch: (action: StockCheckCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createStockCheck(values)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .otherwise(() => {
        // noop
      });
  }
}
