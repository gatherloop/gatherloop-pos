import { Button, Text, XStack, YStack } from 'tamagui';
import { match } from 'ts-pattern';
// Deep imports, not the `domain`/`components/base` barrels (D20): those
// barrels also re-export every POS usecase and Navbar/Sidebar, which pull
// in solito/next — dead weight a Vite build has no business resolving.
import { Cart } from '../../domain/entities/Cart';
import { formatRupiah } from '../../utils/currency';
import { ConfirmationAlert } from '../components/base/ConfirmationAlert/ConfirmationAlert';
import { EmptyView } from '../components/base/EmptyView';
import { ErrorView } from '../components/base/ErrorView';
import { LoadingView } from '../components/base/LoadingView';
import { CartLineItem } from '../components/cart/CartLineItem';

export type CartScreenVariant =
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'empty' }
  | { type: 'loaded'; cart: Cart };

export type CartScreenProps = {
  variant: CartScreenVariant;
  isMutating: boolean;
  errorMessage: string | null;
  isClearConfirmationOpen: boolean;
  onAmountChange: (cartItemId: number, amount: number) => void;
  onRemovePress: (cartItemId: number) => void;
  onEditPress: (cartItemId: number) => void;
  onClearPress: () => void;
  onClearConfirm: () => void;
  onClearCancel: () => void;
  onClearConfirmationOpenChange: (isOpen: boolean) => void;
  onAddMoreItemsPress: () => void;
  onCheckoutPress: () => void;
  onRetryButtonPress: () => void;
};

// FR-7 in docs/prd-table-ordering.md: `/order/t/{code}/cart`. The Checkout
// button stays sticky via the same CSS `position: sticky` trick
// MenuListScreen uses for its search bar — bottom instead of top — rather
// than borrowing `OrderLayout`'s footer slot, which this route hides in
// favor of this screen's own bottom bar (see `app/TableResolve.tsx`).
export const CartScreen = ({
  variant,
  isMutating,
  errorMessage,
  isClearConfirmationOpen,
  onAmountChange,
  onRemovePress,
  onEditPress,
  onClearPress,
  onClearConfirm,
  onClearCancel,
  onClearConfirmationOpenChange,
  onAddMoreItemsPress,
  onCheckoutPress,
  onRetryButtonPress,
}: CartScreenProps) => {
  return (
    <YStack flex={1} gap="$3">
      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Memuat keranjang..." />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Gagal memuat keranjang"
            subtitle="Terjadi kesalahan. Silakan coba lagi."
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Keranjang kosong"
            subtitle="Yuk, tambahkan menu favoritmu."
            actionLabel="Tambah menu lainnya"
            onActionPress={onAddMoreItemsPress}
          />
        ))
        .with({ type: 'loaded' }, ({ cart }) => (
          <YStack gap="$4" paddingBottom="$6">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="bold" fontSize="$6">
                Keranjang
              </Text>
              <Button
                size="$2"
                chromeless
                theme="red"
                color="$red10"
                disabled={isMutating}
                onPress={onClearPress}
                accessibilityLabel="Kosongkan keranjang"
              >
                Kosongkan
              </Button>
            </XStack>

            {errorMessage ? (
              <Text color="$red10">{errorMessage}</Text>
            ) : null}

            <YStack gap="$4">
              {cart.items.map((item) => (
                <CartLineItem
                  key={item.id}
                  item={item}
                  disabled={isMutating}
                  onAmountChange={(amount) => onAmountChange(item.id, amount)}
                  onRemovePress={() => onRemovePress(item.id)}
                  onEditPress={() => onEditPress(item.id)}
                />
              ))}
            </YStack>

            <Button
              variant="outlined"
              minHeight={44}
              onPress={onAddMoreItemsPress}
            >
              Tambah menu lainnya
            </Button>

            <YStack gap="$1">
              <XStack justifyContent="space-between">
                <Text>Jumlah item</Text>
                <Text>{cart.itemCount}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text fontWeight="bold">Total</Text>
                <Text fontWeight="bold">{formatRupiah(cart.total)}</Text>
              </XStack>
            </YStack>

            <YStack
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error - Tamagui's type doesn't include CSS
              // `sticky`, but it passes through to the underlying web style
              // (see MenuListScreen for the same pattern, there stuck to the
              // top instead of the bottom).
              position="sticky"
              bottom={0}
              zIndex={11}
              backgroundColor="$background"
              paddingTop="$3"
              borderTopWidth={1}
              borderTopColor="$borderColor"
            >
              <Button
                theme="blue"
                size="$5"
                minHeight={44}
                onPress={onCheckoutPress}
              >
                {`Checkout · ${formatRupiah(cart.total)}`}
              </Button>
            </YStack>
          </YStack>
        ))
        .exhaustive()}

      <ConfirmationAlert
        title="Kosongkan keranjang?"
        description="Semua item di keranjang akan dihapus."
        confirmText="Kosongkan"
        cancelText="Batal"
        isOpen={isClearConfirmationOpen}
        onOpenChange={onClearConfirmationOpenChange}
        onConfirm={onClearConfirm}
        onCancel={onClearCancel}
      />
    </YStack>
  );
};
