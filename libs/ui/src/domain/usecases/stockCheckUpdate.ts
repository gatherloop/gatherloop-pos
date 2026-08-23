import { match } from 'ts-pattern';
import { StockCheck, StockCheckForm } from '../entities';
import { StockCheckRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: StockCheckForm;
  stockCheckId: number;
};

export type StockCheckUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type StockCheckUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: StockCheckForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: StockCheckForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type StockCheckUpdateParams = {
  stockCheck: StockCheck | null;
  stockCheckId: number;
};

export class StockCheckUpdateUsecase extends Usecase<
  StockCheckUpdateState,
  StockCheckUpdateAction,
  StockCheckUpdateParams
> {
  params: StockCheckUpdateParams;
  repository: StockCheckRepository;

  constructor(
    repository: StockCheckRepository,
    params: StockCheckUpdateParams
  ) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): StockCheckUpdateState {
    return {
      type: this.params.stockCheck !== null ? 'loaded' : 'idle',
      errorMessage: null,
      stockCheckId: this.params.stockCheckId,
      values: {
        items:
          this.params.stockCheck?.items.map((item) => ({
            materialId: item.materialId,
            materialName: item.materialName,
            purchaseUnit: item.purchaseUnit,
            currentStock: item.currentStock,
          })) || [],
      },
    };
  }

  getNextState(
    state: StockCheckUpdateState,
    action: StockCheckUpdateAction
  ): StockCheckUpdateState {
    return match([state, action])
      .returnType<StockCheckUpdateState>()
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
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'submitError',
          errorMessage,
        })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT_CANCEL' }],
        ([state]) => ({ ...state, type: 'loaded' })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: StockCheckUpdateState,
    dispatch: (action: StockCheckUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, ({ stockCheckId }) => {
        this.repository
          .fetchStockCheckById(stockCheckId)
          .then((stockCheck) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                items: stockCheck.items.map((item) => ({
                  materialId: item.materialId,
                  materialName: item.materialName,
                  purchaseUnit: item.purchaseUnit,
                  currentStock: item.currentStock,
                })),
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch stock check',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values, stockCheckId }) => {
        this.repository
          .updateStockCheck(values, stockCheckId)
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
