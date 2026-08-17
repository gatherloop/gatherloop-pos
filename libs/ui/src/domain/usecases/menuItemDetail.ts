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
  | { type: 'CHANGE_NOTE'; note: string };

export type MenuItemDetailParams = {
  productId: number;
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
      product: this.params.product ?? null,
      selectedOptionValueIds: [],
      variant: null,
      amount: 1,
      note: '',
      errorMessage: null,
    };

    if (!context.product) {
      return { ...context, type: 'idle' };
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
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({
          ...state,
          type: 'loadingProduct',
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
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loadingProduct' }, () =>
        this.menuRepository
          .fetchProductById(this.params.productId)
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
