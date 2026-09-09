import { useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
// Deep imports, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { Category } from '../../../domain/entities/Category';
import { Product } from '../../../domain/entities/Product';
import { Variant } from '../../../domain/entities/Variant';
import { SessionRepository } from '../../../domain/repositories/session';
import { CartUsecase } from '../../../domain/usecases/cart';
import {
  MenuItemDetailState,
  MenuItemDetailUsecase,
} from '../../../domain/usecases/menuItemDetail';
import { MenuListUsecase } from '../../../domain/usecases/menuList';
import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import { CartBar } from '../../views/components/cart/CartBar';
import { useUsecase } from '../hooks/useUsecase';
import { useCart } from '../hooks/useCart';
import { useTableResolve } from '../hooks/useTableResolve';
import { MenuItemDetailScreenProps } from '../../views/screens/order/MenuItemDetailScreen';
import { MenuListScreen, MenuListScreenProps } from '../../views/screens/order/MenuListScreen';
import { TableResolveScreenProps } from '../../views/screens/order/TableResolveScreen';

export type MenuListHandlerProps = {
  tableResolveUsecase: TableResolveUsecase;
  menuListUsecase: MenuListUsecase;
  menuItemDetailUsecase: MenuItemDetailUsecase;
  cartUsecase: CartUsecase;
  sessionRepository: SessionRepository;
  tableCode: string;
};

// D4 in docs/trd-order-app-composition-and-ssr.md: grouping is client-side,
// by the category already embedded on each product — there is no
// `categoryId` filter on the underlying fetch. Only categories with at
// least one matching product are kept, so the chip row (FR-5) never offers
// a category that would render an empty section.
function groupByCategory(products: Product[], categories: Category[]) {
  return categories
    .map((category) => ({
      category,
      products: products.filter(
        (product) => product.category.id === category.id
      ),
    }))
    .filter((group) => group.products.length > 0);
}

// FR-5: the "mulai Rp X" starting price is the lowest price among a
// product's own variants. `variants` carries every variant of every
// published purchase product (menuList.ts), so this is a pure client-side
// reduction, not a second fetch.
function computeStartingPriceByProductId(
  variants: Variant[]
): Record<number, number> {
  return variants.reduce<Record<number, number>>((acc, variant) => {
    const productId = variant.product.id;
    if (acc[productId] === undefined || variant.price < acc[productId]) {
      acc[productId] = variant.price;
    }
    return acc;
  }, {});
}

// `product` is `Product | null` in the state's type regardless of `type`
// (the machine's own invariant — every non-loading, non-fetch-failed state
// has a product — isn't expressible in the discriminated union). A plain
// function reads better here than forcing ts-pattern to prove exhaustiveness
// over a combination the type system can't actually rule out.
function toItemDetailScreenVariant(
  state: MenuItemDetailState
): MenuItemDetailScreenProps['variant'] {
  if (state.type === 'idle' || state.type === 'loadingProduct') {
    return { type: 'loading' };
  }
  if (!state.product) {
    return { type: 'error' };
  }
  return {
    type: 'ready',
    product: state.product,
    price: state.variant?.price ?? null,
    variantErrorMessage: state.type === 'error' ? state.errorMessage : null,
  };
}

// FR-5 in docs/prd-order-app-ux-improvements.md.
function toCtaState(
  state: MenuItemDetailState
): 'ready' | 'incomplete' | 'resolving' {
  if (state.type === 'resolvingVariant') return 'resolving';
  if (state.type === 'ready') return 'ready';
  return 'incomplete';
}

function getMissingOptionNames(
  product: Product | null,
  selectedOptionValueIds: number[]
): string[] {
  if (!product) return [];
  return product.options
    .filter(
      (option) =>
        !option.values.some((value) =>
          selectedOptionValueIds.includes(value.id)
        )
    )
    .map((option) => option.name);
}

function buildValidationMessage(missingOptionNames: string[]): string | null {
  if (missingOptionNames.length === 0) return null;
  if (missingOptionNames.length === 1) {
    return `Pilih ${missingOptionNames[0]} dulu ya`;
  }
  const last = missingOptionNames[missingOptionNames.length - 1];
  const rest = missingOptionNames.slice(0, -1).join(', ');
  return `Lengkapi pilihan ${rest} dan ${last}`;
}

// D9 in docs/trd-order-app-composition-and-ssr.md: the table shell
// (formerly the `TableResolve` wrapper) and the item detail sheet (formerly
// `MenuItemDetail`, its own composition root) are both folded in here —
// `tableResolveUsecase` and `menuItemDetailUsecase` are sub-usecases of this
// screen now, the same shape `ProductListHandler` runs
// `productDeleteUsecase` in for the POS (§2.3a).
export const MenuListHandler = ({
  tableResolveUsecase,
  menuListUsecase,
  menuItemDetailUsecase,
  cartUsecase,
  sessionRepository,
  tableCode,
}: MenuListHandlerProps) => {
  const tableResolve = useTableResolve(tableResolveUsecase);
  const menuList = useUsecase(menuListUsecase);
  const menuItemDetail = useUsecase(menuItemDetailUsecase);
  const cart = useCart(cartUsecase);
  const router = useRouter();
  // FR-5: set to the product id once the guest presses the CTA while options
  // are incomplete. Keyed by product id, rather than a plain boolean, so a
  // newly selected item starts clean with no separate reset effect needed
  // (react-hooks/set-state-in-effect) — the comparison below just stops
  // matching once `menuItemDetail`'s own productId moves on.
  const [validationErrorProductId, setValidationErrorProductId] = useState<
    number | null
  >(null);

  // Only a successful resolution is worth remembering (FR-4) — a code the
  // API just rejected has nothing useful to persist for a future cart.
  useEffect(() => {
    if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
      sessionRepository.setTableCode(tableResolve.state.code);
    }
  }, [tableResolve.state, sessionRepository]);

  // D6: opening the sheet is a state transition, not a route — this is the
  // sole trigger for `menuItemDetailUsecase`, covering both a fresh click
  // (`menuList.dispatch({ type: 'SELECT_ITEM' })`) and a `?product=` deep
  // link already present at mount (`menuList`'s own initial state). The
  // product is looked up from the menu already fetched (§2.4/D6) so opening
  // costs no network call — `menuItemDetailUsecase` falls back to its own
  // fetch only if the id isn't found there yet (a deep link racing the
  // menu fetch).
  useEffect(() => {
    const { selectedProductId } = menuList.state;
    if (selectedProductId !== null) {
      const product = menuList.state.products.find(
        (candidate) => candidate.id === selectedProductId
      );
      menuItemDetail.dispatch({
        type: 'SELECT_PRODUCT',
        productId: selectedProductId,
        product,
      });
    }
    // `menuList.state.products` is deliberately not a dependency: this
    // effect's job is reacting to a *selection* changing, not to the menu
    // list refetching. Depending on it too would re-dispatch SELECT_PRODUCT
    // (and reset the draft's amount/note) whenever a background
    // revalidation resolves while the sheet is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuList.state.selectedProductId, menuItemDetail.dispatch]);

  const groups = groupByCategory(
    menuList.state.products,
    menuList.state.categories
  );

  const visibleGroups =
    menuList.state.selectedCategoryId === null
      ? groups
      : groups.filter(
          (group) => group.category.id === menuList.state.selectedCategoryId
        );

  const startingPriceByProductId = computeStartingPriceByProductId(
    menuList.state.variants
  );

  const currentCart = cart.state.cart;
  const footer =
    currentCart && currentCart.itemCount > 0 ? (
      <CartBar
        itemCount={currentCart.itemCount}
        total={currentCart.total}
        onPress={() => router.push(`/t/${tableCode}/cart`)}
      />
    ) : null;

  const missingOptionNames = getMissingOptionNames(
    menuItemDetail.state.product,
    menuItemDetail.state.selectedOptionValueIds
  );

  const itemDetail: MenuListScreenProps['itemDetail'] =
    menuList.state.selectedProductId === null
      ? null
      : {
          isOpen: true,
          onOpenChange: (isOpen) => {
            if (!isOpen) menuList.dispatch({ type: 'CLEAR_ITEM' });
          },
          variant: toItemDetailScreenVariant(menuItemDetail.state),
          selectedOptionValueIds: menuItemDetail.state.selectedOptionValueIds,
          onSelectOptionValue: (optionId, optionValueId) =>
            menuItemDetail.dispatch({
              type: 'SELECT_OPTION_VALUE',
              optionId,
              optionValueId,
            }),
          amount: menuItemDetail.state.amount,
          onAmountChange: (amount) =>
            menuItemDetail.dispatch({ type: 'CHANGE_AMOUNT', amount }),
          note: menuItemDetail.state.note,
          onNoteChange: (note) =>
            menuItemDetail.dispatch({ type: 'CHANGE_NOTE', note }),
          ctaState: toCtaState(menuItemDetail.state),
          missingOptionNames,
          validationMessage:
            validationErrorProductId === menuItemDetail.state.productId
              ? buildValidationMessage(missingOptionNames)
              : null,
          onAddToCartPress: () => {
            if (missingOptionNames.length > 0) {
              setValidationErrorProductId(menuItemDetail.state.productId);
              return;
            }
            const { variant, amount, note } = menuItemDetail.state;
            if (!variant) return;
            cart.dispatch({
              type: 'ADD_ITEM',
              variantId: variant.id,
              amount,
              note,
            });
            menuList.dispatch({ type: 'CLEAR_ITEM' });
          },
          onRetryButtonPress: () =>
            menuItemDetail.dispatch({ type: 'FETCH' }),
        };

  return (
    <MenuListScreen
      tableVariant={match(tableResolve.state)
        .returnType<TableResolveScreenProps['variant']>()
        .with({ type: P.union('idle', 'resolving') }, () => ({
          type: 'resolving',
        }))
        .with({ type: 'noCode' }, () => ({ type: 'noQr' }))
        .with({ type: 'notFound' }, () => ({ type: 'invalidQr' }))
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => tableResolve.dispatch({ type: 'FETCH' }),
        }))
        .with({ type: 'resolved' }, ({ table }) =>
          table
            ? { type: 'resolved', table }
            : {
                type: 'error',
                onRetryButtonPress: () =>
                  tableResolve.dispatch({ type: 'FETCH' }),
              }
        )
        .exhaustive()}
      footer={footer}
      searchValue={menuList.state.query}
      onSearchValueChange={(query: string) =>
        menuList.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          fetchDebounceDelay: 600,
        })
      }
      isSearching={
        menuList.state.type === 'changingParams' ||
        menuList.state.type === 'revalidating'
      }
      chipCategories={groups.map((group) => group.category)}
      selectedCategoryId={menuList.state.selectedCategoryId}
      onSelectCategory={(categoryId: number | null) =>
        menuList.dispatch({
          type: 'CHANGE_PARAMS',
          selectedCategoryId: categoryId,
          fetchDebounceDelay: 0,
        })
      }
      onRetryButtonPress={() => menuList.dispatch({ type: 'FETCH' })}
      onItemPress={(product: Product) =>
        menuList.dispatch({ type: 'SELECT_ITEM', productId: product.id })
      }
      startingPriceByProductId={startingPriceByProductId}
      variant={match(menuList.state)
        .returnType<MenuListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          () => ({
            type: visibleGroups.length > 0 ? 'loaded' : 'empty',
            groups: visibleGroups,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      itemDetail={itemDetail}
    />
  );
};
