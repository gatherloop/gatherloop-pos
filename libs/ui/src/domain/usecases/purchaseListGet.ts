import { match, P } from 'ts-pattern';
import { PurchaseList } from '../entities';
import { PurchaseListQueryRepository, PurchaseListRepository } from '../repositories';
import { PurchaseTypeFilter } from '../entities/Material';
import { Usecase } from './IUsecase';

type Context = {
  purchaseList: PurchaseList | null;
  errorMessage: string | null;
  purchaseTypeFilter: PurchaseTypeFilter;
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
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'CHANGE_PURCHASE_TYPE_FILTER'; filter: PurchaseTypeFilter };

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
  purchaseListQueryRepository: PurchaseListQueryRepository;

  constructor(
    purchaseListRepository: PurchaseListRepository,
    purchaseListQueryRepository: PurchaseListQueryRepository,
    params: PurchaseListGetParams
  ) {
    super();
    this.purchaseListRepository = purchaseListRepository;
    this.purchaseListQueryRepository = purchaseListQueryRepository;
    this.params = params;
  }

  getInitialState(): PurchaseListGetState {
    return {
      type: this.params.purchaseList !== null ? 'loaded' : 'idle',
      purchaseList: this.params.purchaseList,
      errorMessage: null,
      purchaseTypeFilter: this.purchaseListQueryRepository.getPurchaseTypeFilter(),
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
      .with(
        [P.any, { type: 'CHANGE_PURCHASE_TYPE_FILTER' }],
        ([state, { filter }]) => ({ ...state, purchaseTypeFilter: filter })
      )
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
      .with({ type: 'loaded' }, ({ purchaseTypeFilter }) => {
        this.purchaseListQueryRepository.setPurchaseTypeFilter(purchaseTypeFilter);
      })
      .otherwise(() => {
        // noop
      });
  }
}
