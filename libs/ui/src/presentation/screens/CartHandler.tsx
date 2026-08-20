import { useState } from 'react';
// Deep imports, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { CartAction, CartState } from '../../domain/usecases/cart';
import { Controller } from '../controllers/controller';
import { useNavigation } from '../navigation';
import { CartScreen, CartScreenProps } from './CartScreen';

export type CartHandlerProps = {
  cart: Controller<CartState, CartAction>;
  tableCode: string;
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

// FR-7 in docs/prd-table-ordering.md. Unlike every other handler in this
// slice, this one does not bind its own usecase — `cart` is the app-wide
// controller from `CartProvider` (D14), passed down by the composition root
// (`app/Cart.tsx`), because the floating bar, the item detail sheet's
// Add-to-cart CTA and this screen all read and mutate the same machine.
export const CartHandler = ({ cart, tableCode }: CartHandlerProps) => {
  const navigation = useNavigation();
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] =
    useState(false);

  const isMutating =
    cart.state.type === 'adding' ||
    cart.state.type === 'updating' ||
    cart.state.type === 'removing' ||
    cart.state.type === 'clearing';

  return (
    <CartScreen
      variant={toScreenVariant(cart.state)}
      isMutating={isMutating}
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
      onClearPress={() => setIsClearConfirmationOpen(true)}
      onClearConfirm={() => {
        cart.dispatch({ type: 'CLEAR' });
        setIsClearConfirmationOpen(false);
      }}
      onClearCancel={() => setIsClearConfirmationOpen(false)}
      onClearConfirmationOpenChange={setIsClearConfirmationOpen}
      onAddMoreItemsPress={() => navigation.push(`/t/${tableCode}`)}
      onCheckoutPress={() => navigation.push(`/t/${tableCode}/checkout`)}
      onRetryButtonPress={() => cart.dispatch({ type: 'FETCH' })}
    />
  );
};
