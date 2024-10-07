import { match, P } from 'ts-pattern';
import { Product } from '../entities';
import { ProductRepository } from '../repositories';
import { createDebounce } from '../../utils';
import { Usecase } from './IUsecase';

type Context = {
  products: Product[];
  page: number;
  query: string;
  errorMessage: string | null;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type ProductListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type ProductListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; products: Product[]; totalItem: number }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      query?: string;
      fetchDebounceDelay?: number;
    }
  | { type: 'REVALIDATE'; products: Product[]; totalItem: number }
  | { type: 'REVALIDATE_FINISH'; products: Product[]; totalItem: number };

const changeParamsDebounce = createDebounce();

export class ProductListUsecase extends Usecase<
  ProductListState,
  ProductListAction
> {
  repository: ProductRepository;

  constructor(repository: ProductRepository) {
    super();
    this.repository = repository;
  }

  getInitialState() {
    const initialParams = this.repository.getProductListServerParams();
    const { products, totalItem } =
      this.repository.getProductList(initialParams);

    const state: ProductListState = {
      type: products.length >= 1 ? 'loaded' : 'idle',
      totalItem,
      page: initialParams.page,
      query: initialParams.query,
      errorMessage: null,
      sortBy: initialParams.sortBy,
      orderBy: initialParams.orderBy,
      itemPerPage: initialParams.itemPerPage,
      fetchDebounceDelay: 0,
      products,
    };

    return state;
  }

  getNextState(state: ProductListState, action: ProductListAction) {
    return match([state, action])
      .returnType<ProductListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { products, totalItem }]) => ({
          ...state,
          type: 'loaded',
          products,
          totalItem,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          message,
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
        ([state, { products, totalItem }]) => ({
          ...state,
          products,
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
    state: ProductListState,
    dispatch: (action: ProductListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, query, sortBy }) =>
          this.repository
            .fetchProductList({ page, itemPerPage, orderBy, query, sortBy })
            .then(({ products, totalItem }) =>
              dispatch({ type: 'FETCH_SUCCESS', products, totalItem })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch products',
              })
            )
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, orderBy, query, sortBy, fetchDebounceDelay }) => {
          changeParamsDebounce(() => {
            const { products, totalItem } = this.repository.getProductList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            });

            if (products.length > 0) {
              dispatch({ type: 'REVALIDATE', products, totalItem });
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
          products,
          totalItem,
        }) => {
          this.repository
            .fetchProductList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            })
            .then(({ products, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', products, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', products, totalItem })
            );
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
