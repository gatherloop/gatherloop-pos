import { useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { Cart } from '../../../domain/entities/Cart';
import { SessionRepository } from '../../../domain/repositories/session';
import { CartState, CartUsecase } from '../../../domain/usecases/cart';
import { CheckoutUsecase } from '../../../domain/usecases/checkout';
import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import { useCart } from '../hooks/useCart';
import { useCheckout } from '../hooks/useCheckout';
import { useTableResolve } from '../hooks/useTableResolve';
import { CustomerNameSheetProps } from '../../views/components/checkout/CustomerNameSheet';
import { CartItemEditScreenProps } from '../../views/screens/order/CartItemEditScreen';
import { CartScreen, CartScreenProps } from '../../views/screens/order/CartScreen';
import { TableResolveScreenProps } from '../../views/screens/order/TableResolveScreen';

export type CartHandlerProps = {
  tableResolveUsecase: TableResolveUsecase;
  cartUsecase: CartUsecase;
  checkoutUsecase: CheckoutUsecase;
  sessionRepository: SessionRepository;
  enabled: boolean;
  tableCode: string;
  preparingCount?: number;
};

function toScreenVariant(state: CartState): CartScreenProps['variant'] {
  if (state.type === 'idle' || state.type === 'loading') {
    return { type: 'loading' };
  }
  if (state.type === 'error' || !state.cart) {
    return { type: 'error' };
  }
  return state.cart.items.length > 0
    ? { type: 'loaded', cart: state.cart }
    : { type: 'empty' };
}

function isMutating(state: CartState): boolean {
  return (
    state.type === 'adding' ||
    state.type === 'updating' ||
    state.type === 'removing' ||
    state.type === 'clearing'
  );
}

function hasUnavailableItems(cart: Cart | null): boolean {
  if (!cart) return false;
  return cart.items.some((item) => {
    if (!item.variant.isSellable) return true;
    const remaining = item.variant.sellableQuantity;
    return remaining !== undefined && item.amount > remaining;
  });
}

export const CartHandler = ({
  tableResolveUsecase,
  cartUsecase,
  checkoutUsecase,
  sessionRepository,
  enabled,
  tableCode,
  preparingCount,
}: CartHandlerProps) => {
  const tableResolve = useTableResolve(tableResolveUsecase);
  const cart = useCart(cartUsecase);
  const checkout = useCheckout(checkoutUsecase);
  const router = useRouter();
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] =
    useState(false);

  useEffect(() => {
    if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
      sessionRepository.setTableCode(tableResolve.state.code);
    }
  }, [tableResolve.state, sessionRepository]);

  useEffect(() => {
    if (checkout.state.type !== 'created' || !checkout.state.payment) return;

    router.push(`/orders/${checkout.state.payment.reference}`);
  }, [checkout.state, router]);

  useEffect(() => {
    if (checkout.state.type !== 'error') return;
    cart.dispatch({ type: 'FETCH' });
  }, [checkout.state.type, cart.dispatch]);

  const mutating = isMutating(cart.state);

  const selectedItem =
    cart.state.selectedItemId !== null
      ? cart.state.cart?.items.find(
          (existing) => existing.id === cart.state.selectedItemId
        ) ?? null
      : null;

  const [seededItemId, setSeededItemId] = useState<number | null>(null);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState('');

  if (selectedItem && selectedItem.id !== seededItemId) {
    setAmount(selectedItem.amount);
    setNote(selectedItem.note);
    setSeededItemId(selectedItem.id);
  }

  const itemEdit: (CartItemEditScreenProps & { isOpen: true }) | null =
    !selectedItem
      ? null
      : {
          isOpen: true,
          onOpenChange: (isOpen) => {
            if (!isOpen) cart.dispatch({ type: 'CLEAR_ITEM' });
          },
          item: selectedItem,
          amount,
          onAmountChange: setAmount,
          note,
          onNoteChange: setNote,
          isSaving: mutating,
          onSavePress: () => {
            cart.dispatch({
              type: 'UPDATE_ITEM',
              cartItemId: selectedItem.id,
              amount,
              note,
            });
            cart.dispatch({ type: 'CLEAR_ITEM' });
          },
        };

  const nameSheet: (CustomerNameSheetProps & { isOpen: true }) | null =
    checkout.state.type === 'askingName'
      ? {
          isOpen: true,
          name: checkout.state.customerName,
          errorMessage: checkout.state.nameErrorMessage,
          onNameChange: (name) =>
            checkout.dispatch({ type: 'CHANGE_NAME', name }),
          onSubmitPress: () => checkout.dispatch({ type: 'SUBMIT_NAME' }),
          onCancelPress: () => checkout.dispatch({ type: 'CANCEL_NAME' }),
        }
      : null;

  return (
    <CartScreen
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
      onHistoryPress={() => router.push('/orders')}
      preparingCount={preparingCount}
      variant={toScreenVariant(cart.state)}
      isMutating={mutating}
      errorMessage={cart.state.errorMessage}
      isClearConfirmationOpen={isClearConfirmationOpen}
      onAmountChange={(cartItemId, amount) => {
        const item = cart.state.cart?.items.find(
          (existing) => existing.id === cartItemId
        );
        if (!item) return;
        cart.dispatch({
          type: 'UPDATE_ITEM',
          cartItemId,
          amount,
          note: item.note,
        });
      }}
      onRemovePress={(cartItemId) =>
        cart.dispatch({ type: 'REMOVE_ITEM', cartItemId })
      }
      onEditPress={(cartItemId) =>
        cart.dispatch({ type: 'SELECT_ITEM', itemId: cartItemId })
      }
      onClearPress={() => setIsClearConfirmationOpen(true)}
      onClearConfirm={() => {
        cart.dispatch({ type: 'CLEAR' });
        setIsClearConfirmationOpen(false);
      }}
      onClearCancel={() => setIsClearConfirmationOpen(false)}
      onClearConfirmationOpenChange={setIsClearConfirmationOpen}
      onAddMoreItemsPress={() => router.push(`/t/${tableCode}`)}
      onRetryButtonPress={() => cart.dispatch({ type: 'FETCH' })}
      itemEdit={itemEdit}
      isCheckoutEnabled={enabled && !hasUnavailableItems(cart.state.cart)}
      isCheckingOut={checkout.state.type === 'creatingPayment'}
      checkoutErrorMessage={
        checkout.state.type === 'error' ? checkout.state.errorMessage : null
      }
      onCheckoutPress={() => checkout.dispatch({ type: 'ASK_NAME' })}
      onCheckoutRetryPress={() => checkout.dispatch({ type: 'SUBMIT_NAME' })}
      nameSheet={nameSheet}
    />
  );
};
