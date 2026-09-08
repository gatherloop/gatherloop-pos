import { useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
// Deep imports, not the `domain` barrel (D20): that barrel also re-exports
// every POS usecase, which drags unrelated weight into the order bundle.
import { SessionRepository } from '../../../domain/repositories/session';
import { CartState, CartUsecase } from '../../../domain/usecases/cart';
import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import { useCartController } from '../../controllers/CartController';
import { useTableResolveController } from '../../controllers/TableResolveController';
import { CartItemEditScreenProps } from './CartItemEditScreen';
import { CartScreen, CartScreenProps } from './CartScreen';
import { TableResolveScreenProps } from './TableResolveScreen';

export type CartHandlerProps = {
  tableResolveUsecase: TableResolveUsecase;
  cartUsecase: CartUsecase;
  sessionRepository: SessionRepository;
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

function isMutating(state: CartState): boolean {
  return (
    state.type === 'adding' ||
    state.type === 'updating' ||
    state.type === 'removing' ||
    state.type === 'clearing'
  );
}

// D9 in docs/trd-order-app-composition-and-ssr.md: the table shell
// (formerly the `TableResolve` wrapper) and the cart-item-edit modal
// (formerly `CartItemEdit`, its own composition root) are both folded in
// here — `tableResolveUsecase` is a sub-usecase of this screen now, and
// the edit modal's draft `amount`/`note` are the same plain form buffer
// `CartItemEdit` used to hold, just owned by this handler instead — the
// same shape `MenuListHandler` folds `MenuItemDetail` and `TableResolve`
// into itself in.
export const CartHandler = ({
  tableResolveUsecase,
  cartUsecase,
  sessionRepository,
  tableCode,
}: CartHandlerProps) => {
  const tableResolve = useTableResolveController(tableResolveUsecase);
  const cart = useCartController(cartUsecase);
  const router = useRouter();
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] =
    useState(false);

  // Only a successful resolution is worth remembering (FR-4) — a code the
  // API just rejected has nothing useful to persist for a future cart.
  useEffect(() => {
    if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
      sessionRepository.setTableCode(tableResolve.state.code);
    }
  }, [tableResolve.state, sessionRepository]);

  const mutating = isMutating(cart.state);

  // Seeded from the line once it is found, not on every render — the guest's
  // in-progress edits shouldn't be clobbered by cart refetches while the
  // modal is open. Mirrors `CartItemEdit`'s former local state.
  const selectedItem =
    cart.state.selectedItemId !== null
      ? cart.state.cart?.items.find(
          (existing) => existing.id === cart.state.selectedItemId
        ) ?? null
      : null;

  const [seededItemId, setSeededItemId] = useState<number | null>(null);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState('');

  // Adjusted during render (rather than in an effect) so the seeded values
  // are ready for the same commit that shows the item, instead of an extra
  // post-mount render — see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  if (selectedItem && selectedItem.id !== seededItemId) {
    setAmount(selectedItem.amount);
    setNote(selectedItem.note);
    setSeededItemId(selectedItem.id);
  }

  // D6: an unknown or already-removed item id (a garbage `?item=` deep link,
  // or the line being removed elsewhere while the modal is open) falls back
  // to the cart with no modal — the line it referenced is gone, which is the
  // outcome the guest wanted anyway (FR-9).
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
      onCheckoutPress={() => router.push(`/t/${tableCode}/checkout`)}
      onRetryButtonPress={() => cart.dispatch({ type: 'FETCH' })}
      itemEdit={itemEdit}
    />
  );
};
