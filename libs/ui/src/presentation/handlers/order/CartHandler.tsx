import { useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';
import { useRouter } from 'solito/router';
import { SessionRepository } from '../../../domain/repositories/session';
import { CartState, CartUsecase } from '../../../domain/usecases/cart';
import { TableResolveUsecase } from '../../../domain/usecases/tableResolve';
import { useCart } from '../hooks/useCart';
import { useTableResolve } from '../hooks/useTableResolve';
import { CartItemEditScreenProps } from '../../views/screens/order/CartItemEditScreen';
import { CartScreen, CartScreenProps } from '../../views/screens/order/CartScreen';
import { TableResolveScreenProps } from '../../views/screens/order/TableResolveScreen';

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

export const CartHandler = ({
  tableResolveUsecase,
  cartUsecase,
  sessionRepository,
  tableCode,
}: CartHandlerProps) => {
  const tableResolve = useTableResolve(tableResolveUsecase);
  const cart = useCart(cartUsecase);
  const router = useRouter();
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] =
    useState(false);

  useEffect(() => {
    if (tableResolve.state.type === 'resolved' && tableResolve.state.code) {
      sessionRepository.setTableCode(tableResolve.state.code);
    }
  }, [tableResolve.state, sessionRepository]);

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
