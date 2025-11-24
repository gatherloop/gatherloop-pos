import { match, P } from 'ts-pattern';
import { Supplier } from '../entities';
import {
  SupplierRepository,
  SupplierListQueryRepository,
} from '../repositories';
import { createDebounce } from '../../utils/debounce';
import { Usecase } from './IUsecase';

type Context = {
  suppliers: Supplier[];
  page: number;
  query: string;
  errorMessage: string | null;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type SupplierListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type SupplierListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; suppliers: Supplier[]; totalItem: number }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      query?: string;
      fetchDebounceDelay?: number;
    }
  | { type: 'REVALIDATE'; suppliers: Supplier[]; totalItem: number }
  | { type: 'REVALIDATE_FINISH'; suppliers: Supplier[]; totalItem: number };

const changeParamsDebounce = createDebounce();

export type SupplierListParams = {
  suppliers: Supplier[];
  totalItem: number;
  page?: number;
  query?: string;
  sortBy?: 'created_at';
  orderBy?: 'asc' | 'desc';
  itemPerPage?: number;
};

export class SupplierListUsecase extends Usecase<
  SupplierListState,
  SupplierListAction,
  SupplierListParams
> {
  params: SupplierListParams;
  supplierRepository: SupplierRepository;
  supplierListQueryRepository: SupplierListQueryRepository;

  constructor(
    supplierRepository: SupplierRepository,
    supplierListQueryRepository: SupplierListQueryRepository,
    params: SupplierListParams
  ) {
    super();
    this.supplierRepository = supplierRepository;
    this.supplierListQueryRepository = supplierListQueryRepository;
    this.params = params;
  }

  getInitialState() {
    const state: SupplierListState = {
      type: this.params.suppliers.length >= 1 ? 'loaded' : 'idle',
      totalItem: this.params.totalItem,
      page: this.params.page || this.supplierListQueryRepository.getPage(),
      query:
        this.params.query || this.supplierListQueryRepository.getSearchQuery(),
      errorMessage: null,
      sortBy:
        this.params.sortBy || this.supplierListQueryRepository.getSortBy(),
      orderBy:
        this.params.orderBy || this.supplierListQueryRepository.getOrderBy(),
      itemPerPage:
        this.params.itemPerPage ||
        this.supplierListQueryRepository.getItemPerPage(),
      fetchDebounceDelay: 0,
      suppliers: this.params.suppliers,
    };

    return state;
  }

  getNextState(state: SupplierListState, action: SupplierListAction) {
    return match([state, action])
      .returnType<SupplierListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { suppliers, totalItem }]) => ({
          ...state,
          type: 'loaded',
          errorMessage: null,
          suppliers,
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
          { type: P.union('CHANGE_PARAMS') },
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
        ([state, { suppliers, totalItem }]) => ({
          ...state,
          suppliers,
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
    state: SupplierListState,
    dispatch: (action: SupplierListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, query, sortBy }) =>
          this.supplierRepository
            .fetchSupplierList({ page, itemPerPage, orderBy, query, sortBy })
            .then(({ suppliers, totalItem }) =>
              dispatch({ type: 'FETCH_SUCCESS', suppliers, totalItem })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch suppliers',
              })
            )
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, orderBy, query, sortBy, fetchDebounceDelay }) => {
          this.supplierListQueryRepository.setPage(page);
          this.supplierListQueryRepository.setItemPerPage(itemPerPage);
          this.supplierListQueryRepository.setOrderBy(orderBy);
          this.supplierListQueryRepository.setSearchQuery(query);
          this.supplierListQueryRepository.setSortBy(sortBy);

          changeParamsDebounce(() => {
            const { suppliers, totalItem } =
              this.supplierRepository.getSupplierList({
                page,
                itemPerPage,
                orderBy,
                query,
                sortBy,
              });

            if (suppliers.length > 0) {
              dispatch({ type: 'REVALIDATE', suppliers, totalItem });
            } else {
              dispatch({ type: 'FETCH' });
            }
          }, fetchDebounceDelay);
        }
      )
      .with(
        { type: 'revalidating' },
        ({
          page,
          itemPerPage,
          orderBy,
          query,
          sortBy,
          suppliers,
          totalItem,
        }) => {
          this.supplierRepository
            .fetchSupplierList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            })
            .then(({ suppliers, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', suppliers, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', suppliers, totalItem })
            );
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
