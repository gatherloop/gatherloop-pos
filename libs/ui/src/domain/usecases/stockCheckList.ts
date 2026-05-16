import { match, P } from 'ts-pattern';
import { StockCheck } from '../entities';
import { StockCheckRepository, StockCheckListQueryRepository } from '../repositories';
import { createDebounce } from '../../utils/debounce';
import { Usecase } from './IUsecase';

type Context = {
  stockChecks: StockCheck[];
  page: number;
  errorMessage: string | null;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type StockCheckListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type StockCheckListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; stockChecks: StockCheck[]; totalItem: number }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      fetchDebounceDelay?: number;
    }
  | { type: 'REVALIDATE'; stockChecks: StockCheck[]; totalItem: number }
  | { type: 'REVALIDATE_FINISH'; stockChecks: StockCheck[]; totalItem: number };

const changeParamsDebounce = createDebounce();

export type StockCheckListParams = {
  stockChecks: StockCheck[];
  totalItem: number;
  page?: number;
  sortBy?: 'created_at';
  orderBy?: 'asc' | 'desc';
  itemPerPage?: number;
};

export class StockCheckListUsecase extends Usecase<
  StockCheckListState,
  StockCheckListAction,
  StockCheckListParams
> {
  params: StockCheckListParams;
  stockCheckRepository: StockCheckRepository;
  stockCheckListQueryRepository: StockCheckListQueryRepository;

  constructor(
    stockCheckRepository: StockCheckRepository,
    stockCheckListQueryRepository: StockCheckListQueryRepository,
    params: StockCheckListParams
  ) {
    super();
    this.stockCheckRepository = stockCheckRepository;
    this.stockCheckListQueryRepository = stockCheckListQueryRepository;
    this.params = params;
  }

  getInitialState(): StockCheckListState {
    return {
      type: this.params.stockChecks.length >= 1 ? 'loaded' : 'idle',
      totalItem: this.params.totalItem,
      page: this.params.page || this.stockCheckListQueryRepository.getPage(),
      errorMessage: null,
      sortBy: this.params.sortBy || this.stockCheckListQueryRepository.getSortBy(),
      orderBy: this.params.orderBy || this.stockCheckListQueryRepository.getOrderBy(),
      itemPerPage:
        this.params.itemPerPage || this.stockCheckListQueryRepository.getItemPerPage(),
      fetchDebounceDelay: 0,
      stockChecks: this.params.stockChecks,
    };
  }

  getNextState(state: StockCheckListState, action: StockCheckListAction): StockCheckListState {
    return match([state, action])
      .returnType<StockCheckListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { stockChecks, totalItem }]) => ({
          ...state,
          type: 'loaded',
          errorMessage: null,
          stockChecks,
          totalItem,
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
      }))
      .with(
        [
          {
            type: P.union(
              'loaded',
              'changingParams',
              'loading',
              'error',
              'revalidating'
            ),
          },
          { type: 'CHANGE_PARAMS' },
        ],
        ([state, { type: _type, fetchDebounceDelay = 0, ...params }]) => ({
          ...state,
          ...params,
          fetchDebounceDelay,
          type: 'changingParams',
        })
      )
      .with([{ type: 'changingParams' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'changingParams' }, { type: 'REVALIDATE' }],
        ([state, { stockChecks, totalItem }]) => ({
          ...state,
          stockChecks,
          totalItem,
          type: 'revalidating',
        })
      )
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { type: _type, ...params }]) => ({
          ...state,
          ...params,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: StockCheckListState,
    dispatch: (action: StockCheckListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, sortBy }) =>
          this.stockCheckRepository
            .fetchStockCheckList({ page, itemPerPage, orderBy, sortBy })
            .then(({ stockChecks, totalItem }) =>
              dispatch({ type: 'FETCH_SUCCESS', stockChecks, totalItem })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch stock checks',
              })
            )
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, orderBy, sortBy, fetchDebounceDelay }) => {
          this.stockCheckListQueryRepository.setPage(page);
          this.stockCheckListQueryRepository.setItemPerPage(itemPerPage);
          this.stockCheckListQueryRepository.setOrderBy(orderBy);
          this.stockCheckListQueryRepository.setSortBy(sortBy);

          changeParamsDebounce(() => {
            const { stockChecks, totalItem } =
              this.stockCheckRepository.getStockCheckList({
                page,
                itemPerPage,
                orderBy,
                sortBy,
              });

            if (stockChecks.length > 0) {
              dispatch({ type: 'REVALIDATE', stockChecks, totalItem });
            } else {
              dispatch({ type: 'FETCH' });
            }
          }, fetchDebounceDelay);
        }
      )
      .with(
        { type: 'revalidating' },
        ({ page, itemPerPage, orderBy, sortBy, stockChecks, totalItem }) => {
          this.stockCheckRepository
            .fetchStockCheckList({ page, itemPerPage, orderBy, sortBy })
            .then(({ stockChecks, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', stockChecks, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', stockChecks, totalItem })
            );
        }
      )
      .otherwise(() => {
        // noop
      });
  }
}
