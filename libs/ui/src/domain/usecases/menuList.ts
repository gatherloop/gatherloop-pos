import { match, P } from 'ts-pattern';
import { Category, Product, Variant } from '../entities';
import { MenuListQueryRepository, MenuRepository } from '../repositories';
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
  // Every variant of every published purchase product (one fetch, mirroring
  // D4) — lets the menu cards show a "mulai Rp X" starting price without a
  // per-product request.
  variants: Variant[];
  query: string;
  selectedCategoryId: number | null;
  // D6 in docs/trd-order-app-composition-and-ssr.md: the item sheet's open
  // product, read from and written to the URL through
  // `menuListQueryRepository` rather than a route of its own.
  selectedProductId: number | null;
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
  | {
      type: 'FETCH_SUCCESS';
      products: Product[];
      categories: Category[];
      variants: Variant[];
    }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      query?: string;
      selectedCategoryId?: number | null;
      fetchDebounceDelay?: number;
    }
  | {
      type: 'REVALIDATE_FINISH';
      products: Product[];
      categories: Category[];
      variants: Variant[];
    }
  | { type: 'SELECT_ITEM'; productId: number }
  | { type: 'CLEAR_ITEM' };

export type MenuListParams = {
  products: Product[];
  categories: Category[];
  variants?: Variant[];
  selectedProductId?: number | null;
};

const changeParamsDebounce = createDebounce();

export class MenuListUsecase extends Usecase<
  MenuListState,
  MenuListAction,
  MenuListParams
> {
  menuRepository: MenuRepository;
  menuListQueryRepository: MenuListQueryRepository;
  params: MenuListParams;

  constructor(
    menuRepository: MenuRepository,
    menuListQueryRepository: MenuListQueryRepository,
    params: MenuListParams
  ) {
    super();
    this.menuRepository = menuRepository;
    this.menuListQueryRepository = menuListQueryRepository;
    this.params = params;
  }

  getInitialState(): MenuListState {
    return {
      type: this.params.products.length >= 1 ? 'loaded' : 'idle',
      products: this.params.products,
      categories: this.params.categories,
      variants: this.params.variants ?? [],
      query: '',
      selectedCategoryId: null,
      selectedProductId:
        this.params.selectedProductId ??
        this.menuListQueryRepository.getSelectedProductId(),
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
        ([state, { products, categories, variants }]) => ({
          ...state,
          type: 'loaded',
          products,
          categories,
          variants,
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
      // Selecting/clearing the sheet is orthogonal to the fetch machine's
      // own `type` (D6) — it can happen from any of them, and never changes
      // it.
      .with(
        [P._, { type: 'SELECT_ITEM' }],
        ([state, { productId }]) => ({
          ...state,
          selectedProductId: productId,
        })
      )
      .with([P._, { type: 'CLEAR_ITEM' }], ([state]) => ({
        ...state,
        selectedProductId: null,
      }))
      .otherwise(() => state);
  }

  onStateChange(
    state: MenuListState,
    dispatch: (action: MenuListAction) => void
  ): void {
    // Mirrors the selection into the URL (D6) whenever it actually changed
    // — guarded against the current URL rather than folded into a `type`
    // branch below, since SELECT_ITEM/CLEAR_ITEM don't have one of their
    // own and this would otherwise re-push on every unrelated state change
    // (e.g. every keystroke while searching).
    if (
      state.selectedProductId !==
      this.menuListQueryRepository.getSelectedProductId()
    ) {
      this.menuListQueryRepository.setSelectedProductId(
        state.selectedProductId
      );
    }

    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, ({ query }) =>
        this.menuRepository
          .fetchMenu({ query })
          .then(({ products, categories, variants }) =>
            dispatch({ type: 'FETCH_SUCCESS', products, categories, variants })
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
        ({ query, products, categories, variants }) =>
          this.menuRepository
            .fetchMenu({ query })
            .then(({ products, categories, variants }) =>
              dispatch({
                type: 'REVALIDATE_FINISH',
                products,
                categories,
                variants,
              })
            )
            .catch(() =>
              dispatch({
                type: 'REVALIDATE_FINISH',
                products,
                categories,
                variants,
              })
            )
      )
      .otherwise(() => {
        // No side effects for other states
      });
  }
}
