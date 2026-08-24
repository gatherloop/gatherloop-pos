import { useState } from 'react';
import { CartItemEditScreen } from '../presentation/screens/CartItemEditScreen';
import { useNavigation } from '../presentation/navigation';
import { useCart } from './CartProvider';

export type CartItemEditProps = {
  cartItemId: number;
};

// Composition root for the cart line edit modal (FR-9 phase 9 in
// docs/prd-order-app-ux-improvements.md), mounted alongside `Cart` at
// `/t/{code}/cart/items/{cartItemId}` so the cart stays visible behind the
// sheet and Android back dismisses it (D19 in docs/prd-table-ordering.md).
// Reads the app-wide `CartProvider` controller (D14) rather than owning a
// usecase of its own — the draft `amount`/`note` are a plain form buffer in
// local state, not a state machine, because nothing about them is async
// until `Simpan` dispatches `UPDATE_ITEM` into the cart machine that already
// backs the floating bar and the cart screen.
export function CartItemEdit({ cartItemId }: CartItemEditProps) {
  const cart = useCart();
  const navigation = useNavigation();
  const item =
    cart.state.cart?.items.find((existing) => existing.id === cartItemId) ??
    null;

  // Seeded from the line once it is found, not on every render — the guest's
  // in-progress edits shouldn't be clobbered by cart refetches while the
  // modal is open.
  const [seededItemId, setSeededItemId] = useState<number | null>(null);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState('');

  // Adjusted during render (rather than in an effect) so the seeded values
  // are ready for the same commit that shows the item, instead of an extra
  // post-mount render — see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  if (item && item.id !== seededItemId) {
    setAmount(item.amount);
    setNote(item.note);
    setSeededItemId(item.id);
  }

  // Unknown or already-removed cartItemId: fall back to the cart with no
  // modal (FR-9) — the line it referenced is gone, which is the outcome the
  // guest wanted anyway.
  if (!item) return null;

  const isMutating =
    cart.state.type === 'adding' ||
    cart.state.type === 'updating' ||
    cart.state.type === 'removing' ||
    cart.state.type === 'clearing';

  const closeSheet = () => navigation.back();

  return (
    <CartItemEditScreen
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) closeSheet();
      }}
      item={item}
      amount={amount}
      onAmountChange={setAmount}
      note={note}
      onNoteChange={setNote}
      isSaving={isMutating}
      onSavePress={() => {
        cart.dispatch({ type: 'UPDATE_ITEM', cartItemId, amount, note });
        closeSheet();
      }}
    />
  );
}
