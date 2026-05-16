import { match, P } from 'ts-pattern';
import { PurchaseList } from '../entities';
import { PurchaseListRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  purchaseList: PurchaseList | null;
  errorMessage: string | null;
};

export type PurchaseListGetState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type PurchaseListGetAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; purchaseList: PurchaseList }
  | { type: 'FETCH_ERROR'; message: string };

export type PurchaseListGetParams = {
  stockCheckId: number;
  purchaseList: PurchaseList | null;
};

export class PurchaseListGetUsecase extends Usecase<
  PurchaseListGetState,
  PurchaseListGetAction,
  PurchaseListGetParams
> {
  params: PurchaseListGetParams;
  purchaseListRepository: PurchaseListRepository;

  constructor(
    purchaseListRepository: PurchaseListRepository,
    params: PurchaseListGetParams
  ) {
    super();
    this.purchaseListRepository = purchaseListRepository;
    this.params = params;
  }

  getInitialState(): PurchaseListGetState {
    return {
      type: this.params.purchaseList !== null ? 'loaded' : 'idle',
      purchaseList: this.params.purchaseList,
      errorMessage: null,
    };
  }

  getNextState(
    state: PurchaseListGetState,
    action: PurchaseListGetAction
  ): PurchaseListGetState {
    return match([state, action])
      .returnType<PurchaseListGetState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { purchaseList }]) => ({
          ...state,
          type: 'loaded',
          purchaseList,
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
      .with(
        [{ type: 'revalidating' }, { type: 'FETCH_SUCCESS' }],
        ([state, { purchaseList }]) => ({
          ...state,
          type: 'loaded',
          purchaseList,
          errorMessage: null,
        })
      )
      .with([{ type: 'revalidating' }, { type: 'FETCH_ERROR' }], ([state]) => ({
        ...state,
        type: 'loaded',
      }))
      .otherwise(() => state);
  }

  onStateChange(
    state: PurchaseListGetState,
    dispatch: (action: PurchaseListGetAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: P.union('loading', 'revalidating') }, () => {
        this.purchaseListRepository
          .fetchPurchaseList(this.params.stockCheckId)
          .then((purchaseList) =>
            dispatch({ type: 'FETCH_SUCCESS', purchaseList })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch purchase list',
            })
          );
      })
      .otherwise(() => {
        // noop
      });
  }
}
