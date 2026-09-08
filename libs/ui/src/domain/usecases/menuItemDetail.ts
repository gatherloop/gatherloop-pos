import { match, P } from 'ts-pattern';
import { Product, Variant } from '../entities';
import { MenuRepository } from '../repositories';
import { Usecase } from './IUsecase';

// FR-6 in docs/prd-table-ordering.md. Selecting a value for every Option
// moves the machine into resolvingVariant, which resolves the variant the
// same way TransactionItemSelect does for the POS — GET
// /public/variants?productId=&optionValueIds[]=. `ready` is reached only
// once a variant resolves, so the Add-to-cart CTA's enabled rule is a
// state, not an `if` in the screen.
type Context = {
  // D6 in docs/trd-order-app-composition-and-ssr.md: `null` means no item is
  // selected — one instance of this usecase now serves every selection on
  // the menu screen (SELECT_PRODUCT), not just the one it was constructed
  // with.
  productId: number | null;
  product: Product | null;
  selectedOptionValueIds: number[];
  variant: Variant | null;
  amount: number;
  note: string;
  errorMessage: string | null;
};

export type MenuItemDetailState = (
  | { type: 'idle' }
  | { type: 'loadingProduct' }
  | { type: 'selectingOptions' }
  | { type: 'resolvingVariant' }
  | { type: 'ready' }
  | { type: 'error' }
) &
  Context;

export type MenuItemDetailAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; product: Product }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'SELECT_OPTION_VALUE'; optionId: number; optionValueId: number }
  | { type: 'RESOLVE_VARIANT_SUCCESS'; variant: Variant }
  | { type: 'RESOLVE_VARIANT_ERROR'; message: string }
  | { type: 'CHANGE_AMOUNT'; amount: number }
  | { type: 'CHANGE_NOTE'; note: string }
  // D6 in docs/trd-order-app-composition-and-ssr.md — the same shape
  // ProductDeleteUsecase's SHOW_CONFIRMATION uses to receive the product it
  // is asked to act on. `product` is optional: the menu screen already has
  // the full `Product` (options included) from its own fetch, and passes it
  // along so opening the sheet costs no network call — the fallback fetch
  // below only runs when it isn't given (e.g. a deep link racing the menu
  // fetch).
  | { type: 'SELECT_PRODUCT'; productId: number; product?: Product };

export type MenuItemDetailParams = {
  productId: number | null;
  product?: Product | null;
};

function nextOptionSelectionType(
  product: Product | null,
  selectedOptionValueIds: number[]
): 'selectingOptions' | 'resolvingVariant' {
  return product && selectedOptionValueIds.length === product.options.length
    ? 'resolvingVariant'
    : 'selectingOptions';
}

export class MenuItemDetailUsecase extends Usecase<
  MenuItemDetailState,
  MenuItemDetailAction,
  MenuItemDetailParams
> {
  menuRepository: MenuRepository;
  params: MenuItemDetailParams;

  constructor(menuRepository: MenuRepository, params: MenuItemDetailParams) {
    super();
    this.menuRepository = menuRepository;
    this.params = params;
  }

  getInitialState(): MenuItemDetailState {
    const context: Context = {
      productId: this.params.productId,
      product: this.params.product ?? null,
      selectedOptionValueIds: [],
      variant: null,
      amount: 1,
      note: '',
      errorMessage: null,
    };

    if (context.productId === null) {
      return { ...context, type: 'idle' };
    }

    if (!context.product) {
      return { ...context, type: 'loadingProduct' };
    }

    return {
      ...context,
      type: nextOptionSelectionType(context.product, []),
    };
  }

  getNextState(
    state: MenuItemDetailState,
    action: MenuItemDetailAction
  ): MenuItemDetailState {
    return match([state, action])
      .returnType<MenuItemDetailState>()
      .with([{ type: 'error' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loadingProduct',
        errorMessage: null,
      }))
      // D6: selecting an item (from any state, including a previous
      // selection's `ready`/`error`) resets the draft — a fresh product,
      // not a continuation of whatever was open before. Given a `product`
      // already, skip the fetch entirely (§2.4/D6: the menu payload already
      // has everything the sheet needs).
      .with(
        [P._, { type: 'SELECT_PRODUCT' }],
        ([state, { productId, product = null }]) => ({
          ...state,
          type: product
            ? nextOptionSelectionType(product, [])
            : 'loadingProduct',
          productId,
          product,
          selectedOptionValueIds: [],
          variant: null,
          amount: 1,
          note: '',
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loadingProduct' }, { type: 'FETCH_SUCCESS' }],
        ([state, { product }]) => ({
          ...state,
          type: nextOptionSelectionType(product, []),
          product,
          selectedOptionValueIds: [],
        })
      )
      .with(
        [{ type: 'loadingProduct' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with(
        [
          {
            type: P.union(
              'selectingOptions',
              'resolvingVariant',
              'ready',
              'error'
            ),
          },
          { type: 'SELECT_OPTION_VALUE' },
        ],
        ([state, { optionId, optionValueId }]) => {
          const option = state.product?.options.find(
            (o) => o.id === optionId
          );
          const selectedOptionValueIds = option
            ? [
                ...state.selectedOptionValueIds.filter(
                  (id) => !option.values.some((value) => value.id === id)
                ),
                optionValueId,
              ]
            : state.selectedOptionValueIds;

          return {
            ...state,
            type: nextOptionSelectionType(
              state.product,
              selectedOptionValueIds
            ),
            selectedOptionValueIds,
            variant: null,
            errorMessage: null,
          };
        }
      )
      .with(
        [{ type: 'resolvingVariant' }, { type: 'RESOLVE_VARIANT_SUCCESS' }],
        ([state, { variant }]) => ({
          ...state,
          type: 'ready',
          variant,
        })
      )
      .with(
        [{ type: 'resolvingVariant' }, { type: 'RESOLVE_VARIANT_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with(
        [
          {
            type: P.union(
              'selectingOptions',
              'resolvingVariant',
              'ready',
              'error'
            ),
          },
          { type: 'CHANGE_AMOUNT' },
        ],
        ([state, { amount }]) => ({
          ...state,
          amount: Math.max(1, amount),
        })
      )
      .with(
        [
          {
            type: P.union(
              'selectingOptions',
              'resolvingVariant',
              'ready',
              'error'
            ),
          },
          { type: 'CHANGE_NOTE' },
        ],
        ([state, { note }]) => ({
          ...state,
          note,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: MenuItemDetailState,
    dispatch: (action: MenuItemDetailAction) => void
  ): void {
    match(state)
      // `idle` means nothing is selected (D6) — there is nothing to fetch,
      // unlike the old "always has a productId" shape this replaced.
      .with({ type: 'loadingProduct' }, ({ productId }) =>
        this.menuRepository
          .fetchProductById(productId ?? NaN)
          .then((product) => dispatch({ type: 'FETCH_SUCCESS', product }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch product',
            })
          )
      )
      .with(
        { type: 'resolvingVariant' },
        ({ product, selectedOptionValueIds }) => {
          if (!product) return;

          this.menuRepository
            .resolveVariant({
              productId: product.id,
              optionValueIds: selectedOptionValueIds,
            })
            .then((variant) =>
              dispatch({ type: 'RESOLVE_VARIANT_SUCCESS', variant })
            )
            .catch(() =>
              dispatch({
                type: 'RESOLVE_VARIANT_ERROR',
                message: 'Failed to resolve variant',
              })
            );
        }
      )
      .otherwise(() => {
        // No side effects for other states
      });
  }
}
