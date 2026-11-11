import { match, P } from 'ts-pattern';
import { Product, Variant } from '../entities';
import { MenuItemQueryRepository, MenuRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  productId: number | null;
  product: Product | null;
  selectedOptionValueIds: number[];
  variant: Variant | null;
  amount: number;
  note: string;
  errorMessage: string | null;
  isValidationVisible: boolean;
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
  | { type: 'CLEAR_PRODUCT' }
  | { type: 'SHOW_VALIDATION' }
  | {
      type: 'SELECT_PRODUCT';
      productId: number;
      product?: Product;
      preselectedOptionValueIds?: number[];
    };

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

function initialSelectedOptionValueIds(
  product: Product,
  preselectedOptionValueIds: number[] = []
): number[] {
  const [onlyOption] = product.options;
  const autoSelected =
    product.options.length === 1 && onlyOption.values.length === 1
      ? [onlyOption.values[0].id]
      : [];

  // D13: preselect a value only when it is the sole match within its own
  // option — two matched values of the same option cancel each other out.
  const unambiguouslyMatched = product.options.flatMap((option) => {
    const matched = option.values.filter((value) =>
      preselectedOptionValueIds.includes(value.id)
    );
    return matched.length === 1 ? [matched[0].id] : [];
  });

  return Array.from(new Set([...autoSelected, ...unambiguouslyMatched]));
}

function clampAmountToVariant(amount: number, variant: Variant | null): number {
  const max = variant?.isSellable ? variant.sellableQuantity : undefined;
  const capped = max !== undefined ? Math.min(amount, max) : amount;
  return Math.max(1, capped);
}

export class MenuItemDetailUsecase extends Usecase<
  MenuItemDetailState,
  MenuItemDetailAction,
  MenuItemDetailParams
> {
  menuRepository: MenuRepository;
  menuItemQueryRepository: MenuItemQueryRepository;
  params: MenuItemDetailParams;

  constructor(
    menuRepository: MenuRepository,
    menuItemQueryRepository: MenuItemQueryRepository,
    params: MenuItemDetailParams
  ) {
    super();
    this.menuRepository = menuRepository;
    this.menuItemQueryRepository = menuItemQueryRepository;
    this.params = params;
  }

  getInitialState(): MenuItemDetailState {
    const product = this.params.product ?? null;
    const context: Context = {
      productId:
        this.params.productId ??
        this.menuItemQueryRepository.getSelectedProductId(),
      product,
      selectedOptionValueIds: product
        ? initialSelectedOptionValueIds(product)
        : [],
      variant: null,
      amount: 1,
      note: '',
      errorMessage: null,
      isValidationVisible: false,
    };

    if (context.productId === null) {
      return { ...context, type: 'idle' };
    }

    if (!context.product) {
      return { ...context, type: 'loadingProduct' };
    }

    return {
      ...context,
      type: nextOptionSelectionType(
        context.product,
        context.selectedOptionValueIds
      ),
    };
  }

  getNextState(
    state: MenuItemDetailState,
    action: MenuItemDetailAction
  ): MenuItemDetailState {
    return (
      match([state, action])
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
          ([
            state,
            { productId, product = null, preselectedOptionValueIds = [] },
          ]) => {
            const selectedOptionValueIds = product
              ? initialSelectedOptionValueIds(
                  product,
                  preselectedOptionValueIds
                )
              : [];
            return {
              ...state,
              type: product
                ? nextOptionSelectionType(product, selectedOptionValueIds)
                : 'loadingProduct',
              productId,
              product,
              selectedOptionValueIds,
              variant: null,
              amount: 1,
              note: '',
              errorMessage: null,
              isValidationVisible: false,
            };
          }
        )
        .with([P._, { type: 'CLEAR_PRODUCT' }], ([state]) => ({
          ...state,
          type: 'idle',
          productId: null,
          product: null,
          selectedOptionValueIds: [],
          variant: null,
          amount: 1,
          note: '',
          errorMessage: null,
          isValidationVisible: false,
        }))
        .with(
          [
            { type: P.union('selectingOptions', 'resolvingVariant', 'ready') },
            { type: 'SHOW_VALIDATION' },
          ],
          ([state]) => ({ ...state, isValidationVisible: true })
        )
        .with(
          [{ type: 'loadingProduct' }, { type: 'FETCH_SUCCESS' }],
          ([state, { product }]) => {
            const selectedOptionValueIds =
              initialSelectedOptionValueIds(product);
            return {
              ...state,
              type: nextOptionSelectionType(product, selectedOptionValueIds),
              product,
              selectedOptionValueIds,
            };
          }
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
            amount: clampAmountToVariant(state.amount, variant),
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
            amount: clampAmountToVariant(amount, state.variant),
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
        .otherwise(() => state)
    );
  }

  onStateChange(
    state: MenuItemDetailState,
    dispatch: (action: MenuItemDetailAction) => void
  ): void {
    if (
      state.productId !== this.menuItemQueryRepository.getSelectedProductId()
    ) {
      this.menuItemQueryRepository.setSelectedProductId(state.productId);
    }

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
