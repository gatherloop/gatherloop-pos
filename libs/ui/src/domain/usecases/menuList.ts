import { match, P } from 'ts-pattern';
import { Category, Product } from '../entities';
import { MenuRepository } from '../repositories';
import { createDebounce } from '../../utils';
import { Usecase } from './IUsecase';

// FR-5 in docs/prd-table-ordering.md. Mirrors ProductListUsecase minus
// pagination — the menu is one fetch (D4) — and minus a sync "getX" cache
// read, since the public catalog has no equivalent of the POS's
// query-cache short-circuit; every revalidation goes straight to the
// network.
type Context = {
  products: Product[];
  categories: Category[];
  query: string;
  selectedCategoryId: number | null;
  errorMessage: string | null;
  fetchDebounceDelay: number;
};

export type MenuListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'changingParams' }
  | { type: 'revalidating' }
) &
  Context;

export type MenuListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; products: Product[]; categories: Category[] }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      query?: string;
      selectedCategoryId?: number | null;
      fetchDebounceDelay?: number;
    }
  | { type: 'REVALIDATE_FINISH'; products: Product[]; categories: Category[] };

export type MenuListParams = {
  products: Product[];
  categories: Category[];
};

const changeParamsDebounce = createDebounce();

export class MenuListUsecase extends Usecase<
  MenuListState,
  MenuListAction,
  MenuListParams
> {
  menuRepository: MenuRepository;
  params: MenuListParams;

  constructor(menuRepository: MenuRepository, params: MenuListParams) {
    super();
    this.menuRepository = menuRepository;
    this.params = params;
  }

  getInitialState(): MenuListState {
    return {
      type: this.params.products.length >= 1 ? 'loaded' : 'idle',
      products: this.params.products,
      categories: this.params.categories,
      query: '',
      selectedCategoryId: null,
      errorMessage: null,
      fetchDebounceDelay: 0,
    };
  }

  getNextState(state: MenuListState, action: MenuListAction): MenuListState {
    return match([state, action])
      .returnType<MenuListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { products, categories }]) => ({
          ...state,
          type: 'loaded',
          products,
          categories,
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
        type: state.products.length === 0 ? 'loading' : 'revalidating',
      }))
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
    state: MenuListState,
    dispatch: (action: MenuListAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, ({ query }) =>
        this.menuRepository
          .fetchMenu({ query })
          .then(({ products, categories }) =>
            dispatch({ type: 'FETCH_SUCCESS', products, categories })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch menu',
            })
          )
      )
      .with({ type: 'changingParams' }, ({ fetchDebounceDelay }) => {
        changeParamsDebounce(
          () => dispatch({ type: 'FETCH' }),
          fetchDebounceDelay
        );
      })
      .with(
        { type: 'revalidating' },
        ({ query, products, categories }) =>
          this.menuRepository
            .fetchMenu({ query })
            .then(({ products, categories }) =>
              dispatch({ type: 'REVALIDATE_FINISH', products, categories })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', products, categories })
            )
      )
      .otherwise(() => {
        // No side effects for other states
      });
  }
}
