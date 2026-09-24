import { useEffect, useRef, useState } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { Category } from '../../../domain/entities/Category';
import { Product } from '../../../domain/entities/Product';
import { Variant } from '../../../domain/entities/Variant';
import { CartRepository } from '../../../domain/repositories/cart';
import { PaymentRepository } from '../../../domain/repositories/payment';
import { SessionRepository } from '../../../domain/repositories/session';
import { CartUsecase } from '../../../domain/usecases/cart';
import {
  MenuItemDetailState,
  MenuItemDetailUsecase,
} from '../../../domain/usecases/menuItemDetail';
import { MenuListUsecase } from '../../../domain/usecases/menuList';
import { PaymentCancelUsecase } from '../../../domain/usecases/paymentCancel';
import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import {
  matchMenuSearch,
  resolveOptionValueAvailability,
} from '../../../utils';
import { CartBar } from '../../views/components/cart/CartBar';
import { PendingPaymentBar } from '../../views/components/cart/PendingPaymentBar';
import { useUsecase } from '../hooks/useUsecase';
import { useCart } from '../hooks/useCart';
import { usePaymentCancel } from '../hooks/usePaymentCancel';
import { useTableResolve } from '../hooks/useTableResolve';
import { MenuItemDetailScreenProps } from '../../views/screens/order/MenuItemDetailScreen';
import {
  MenuListScreen,
  MenuListScreenProps,
} from '../../views/screens/order/MenuListScreen';
import { TableResolveScreenProps } from '../../views/screens/order/TableResolveScreen';

export type MenuListHandlerProps = {
  tableResolveUsecase: TableResolveUsecase;
  menuListUsecase: MenuListUsecase;
  menuItemDetailUsecase: MenuItemDetailUsecase;
  cartUsecase: CartUsecase;
  cartRepository: CartRepository;
  paymentRepository: PaymentRepository;
  sessionRepository: SessionRepository;
  tableCode: string;
  preparingCount?: number;
};

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

function computePreselectedOptionValueIds(
  query: string,
  product: Product
): number[] {
  return matchMenuSearch(query, product).matchedOptionValues.map(
    (value) => value.id
  );
}

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

function computeMatchedLabels(
  query: string,
  product: Product,
  variants: Variant[]
): string[] {
  const searchResult = matchMenuSearch(query, product);
  if (!searchResult.matched) return [];

  const productVariants = variants.filter(
    (variant) => variant.product.id === product.id
  );
  const optionValueAvailability = resolveOptionValueAvailability(
    product,
    productVariants,
    []
  );

  return [...searchResult.matchedOptionValues]
    .sort(
      (a, b) =>
        Number(optionValueAvailability[b.id] ?? false) -
        Number(optionValueAvailability[a.id] ?? false)
    )
    .map((value) => value.name);
}

function computeMatchedLabelsByProductId(
  query: string,
  products: Product[],
  variants: Variant[]
): Record<number, string[]> {
  return products.reduce<Record<number, string[]>>((acc, product) => {
    const labels = computeMatchedLabels(query, product, variants);
    if (labels.length > 0) acc[product.id] = labels;
    return acc;
  }, {});
}

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
    isVariantSellable: state.variant?.isSellable ?? null,
    remainingQuantity: state.variant?.isSellable
      ? state.variant.sellableQuantity
      : undefined,
  };
}

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

function computeOptionValueAvailability(
  product: Product | null,
  variants: Variant[],
  selectedOptionValueIds: number[]
): Record<number, boolean> {
  if (!product) return {};
  const productVariants = variants.filter(
    (variant) => variant.product.id === product.id
  );
  return resolveOptionValueAvailability(
    product,
    productVariants,
    selectedOptionValueIds
  );
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

export const MenuListHandler = ({
  tableResolveUsecase,
  menuListUsecase,
  menuItemDetailUsecase,
  cartUsecase,
  cartRepository,
  paymentRepository,
  sessionRepository,
  tableCode,
  preparingCount,
}: MenuListHandlerProps) => {
  const tableResolve = useTableResolve(tableResolveUsecase);
  const menuList = useUsecase(menuListUsecase);
  const menuItemDetail = useUsecase(menuItemDetailUsecase);
  const cart = useCart(cartUsecase);
  const router = useRouter();
  const [validationErrorProductId, setValidationErrorProductId] = useState<
    number | null
  >(null);

  const currentCart = cart.state.cart;
  const pendingPayment = currentCart?.pendingPayment ?? null;

  const [paymentCancelUsecase, setPaymentCancelUsecase] = useState(
    () =>
      new PaymentCancelUsecase(paymentRepository, {
        reference: pendingPayment?.partnerReferenceNo ?? '',
        method: pendingPayment?.method ?? 'qris',
      })
  );

  if (
    pendingPayment &&
    (pendingPayment.partnerReferenceNo !==
      paymentCancelUsecase.params.reference ||
      pendingPayment.method !== paymentCancelUsecase.params.method)
  ) {
    setPaymentCancelUsecase(
      new PaymentCancelUsecase(paymentRepository, {
        reference: pendingPayment.partnerReferenceNo,
        method: pendingPayment.method,
      })
    );
  }

  const paymentCancel = usePaymentCancel(paymentCancelUsecase);
  const handledCancelResultRef = useRef<
    typeof paymentCancel.state.result
  >(null);
  const isAddAfterCancelPendingRef = useRef(false);

  useEffect(() => {
    if (
      paymentCancel.state.type !== 'settled' ||
      !paymentCancel.state.result ||
      handledCancelResultRef.current === paymentCancel.state.result
    ) {
      return;
    }
    handledCancelResultRef.current = paymentCancel.state.result;

    if (paymentCancel.state.result.status === 'paid') {
      router.push(`/orders/${paymentCancel.state.result.reference}`);
    } else {
      isAddAfterCancelPendingRef.current = true;
      cart.dispatch({ type: 'FETCH' });
    }
  }, [paymentCancel.state, router, cart.dispatch]);

  useEffect(() => {
    if (!isAddAfterCancelPendingRef.current || cart.state.type !== 'loaded') {
      return;
    }

    isAddAfterCancelPendingRef.current = false;
    const { variant, amount, note } = menuItemDetail.state;
    if (variant) {
      cart.dispatch({ type: 'ADD_ITEM', variantId: variant.id, amount, note });
    }
    menuList.dispatch({ type: 'CLEAR_ITEM' });
  }, [cart.state.type, cart.dispatch, menuItemDetail.state, menuList.dispatch]);

  useEffect(() => {
    if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
      sessionRepository.setTableCode(tableResolve.state.code);
    }
  }, [tableResolve.state, sessionRepository]);

  const boundTableCodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (tableResolve.state.type !== 'resolved' || !tableResolve.state.code) {
      return;
    }
    const code = tableResolve.state.code;
    if (boundTableCodeRef.current === code) return;
    boundTableCodeRef.current = code;
    cartRepository.updateTable(code).catch(() => {
      boundTableCodeRef.current = null;
    });
  }, [tableResolve.state, cartRepository]);

  useEffect(() => {
    const { selectedProductId, query } = menuList.state;
    if (selectedProductId !== null) {
      const product = menuList.state.products.find(
        (candidate) => candidate.id === selectedProductId
      );
      menuItemDetail.dispatch({
        type: 'SELECT_PRODUCT',
        productId: selectedProductId,
        product,
        preselectedOptionValueIds: product
          ? computePreselectedOptionValueIds(query, product)
          : [],
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

  const matchedLabelsByProductId = computeMatchedLabelsByProductId(
    menuList.state.query,
    menuList.state.products,
    menuList.state.variants
  );

  const footer = pendingPayment ? (
    <PendingPaymentBar
      method={pendingPayment.method}
      amount={pendingPayment.amount}
      expiredAt={pendingPayment.expiredAt}
      onContinuePress={() =>
        router.push(`/orders/${pendingPayment.partnerReferenceNo}`)
      }
      onCountdownElapsed={() => cart.dispatch({ type: 'FETCH' })}
    />
  ) : currentCart && currentCart.itemCount > 0 ? (
    <CartBar
      itemCount={currentCart.itemCount}
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
          optionValueAvailability: computeOptionValueAvailability(
            menuItemDetail.state.product,
            menuList.state.variants,
            menuItemDetail.state.selectedOptionValueIds
          ),
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
          onRetryButtonPress: () => menuItemDetail.dispatch({ type: 'FETCH' }),
          lockedNotice: pendingPayment
            ? {
                onContinuePress: () =>
                  router.push(`/orders/${pendingPayment.partnerReferenceNo}`),
                cancelAction: pendingPayment.canCancel
                  ? {
                      label: 'Batalkan & tambah item',
                      onPress: () =>
                        paymentCancel.dispatch({ type: 'REQUEST' }),
                    }
                  : null,
              }
            : null,
        };

  const cancelConfirmation = {
    isOpen:
      paymentCancel.state.type === 'confirming' ||
      paymentCancel.state.type === 'cancelling',
    method: paymentCancel.state.method,
    isCancelling: paymentCancel.state.type === 'cancelling',
    onConfirm: () => paymentCancel.dispatch({ type: 'CONFIRM' }),
    onDismiss: () => paymentCancel.dispatch({ type: 'DISMISS' }),
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
      matchedLabelsByProductId={matchedLabelsByProductId}
      onHistoryPress={() => router.push('/orders')}
      preparingCount={preparingCount}
      cartErrorMessage={
        !pendingPayment && cart.state.errorMessage
          ? cart.state.errorMessage
          : null
      }
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
      cancelConfirmation={cancelConfirmation}
    />
  );
};
