import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';
import { match } from 'ts-pattern';
import { Cart } from '../../../../domain/entities/Cart';
import { formatRupiah } from '../../../../utils/currency';
import { ConfirmationAlert } from '../../components/base/ConfirmationAlert/ConfirmationAlert';
import { EmptyView } from '../../components/base/EmptyView';
import { ErrorView } from '../../components/base/ErrorView';
import { LoadingView } from '../../components/base/LoadingView';
import { CartLineItem } from '../../components/cart/CartLineItem';
import {
  CustomerDetailsSheet,
  CustomerDetailsSheetProps,
} from '../../components/checkout/CustomerDetailsSheet';
import {
  CartItemEditScreen,
  CartItemEditScreenProps,
} from './CartItemEditScreen';
import {
  TableResolveScreen,
  TableResolveScreenProps,
} from './TableResolveScreen';

export type CartScreenVariant =
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'empty' }
  | { type: 'loaded'; cart: Cart };

export type CartScreenProps = {
  tableVariant: TableResolveScreenProps['variant'];
  onHistoryPress?: () => void;
  preparingCount?: number;
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
  onRetryButtonPress: () => void;
  itemEdit: (CartItemEditScreenProps & { isOpen: true }) | null;
  isCheckoutEnabled: boolean;
  isCheckingOut: boolean;
  checkoutErrorMessage: string | null;
  onCheckoutPress: () => void;
  onCheckoutRetryPress: () => void;
  detailsSheet: (CustomerDetailsSheetProps & { isOpen: true }) | null;
};

export const CartScreen = ({
  tableVariant,
  onHistoryPress,
  preparingCount,
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
  onRetryButtonPress,
  itemEdit,
  isCheckoutEnabled,
  isCheckingOut,
  checkoutErrorMessage,
  onCheckoutPress,
  onCheckoutRetryPress,
  detailsSheet,
}: CartScreenProps) => {
  const footer =
    variant.type === 'loaded' ? (
      <YStack
        gap="$2"
        padding="$3"
        backgroundColor="$background"
        borderTopWidth={1}
        borderTopColor="$borderColor"
      >
        {checkoutErrorMessage ? (
          <YStack gap="$2" alignItems="center">
            <Text fontWeight="bold" textAlign="center">
              Gagal membuat pembayaran
            </Text>
            <Text color="$color10" textAlign="center">
              Terjadi kesalahan. Silakan coba lagi.
            </Text>
            <XStack width="100%">
              <Button
                theme="blue"
                size="$5"
                minHeight={44}
                flex={1}
                onPress={onCheckoutRetryPress}
              >
                Retry
              </Button>
            </XStack>
          </YStack>
        ) : (
          <>
            <XStack>
              <Button
                theme="blue"
                size="$5"
                minHeight={44}
                flex={1}
                disabled={!isCheckoutEnabled || isCheckingOut}
                onPress={onCheckoutPress}
              >
                {isCheckingOut
                  ? 'Memproses...'
                  : `Bayar dengan QRIS · ${formatRupiah(variant.cart.total)}`}
              </Button>
            </XStack>
            {!isCheckoutEnabled ? (
              <Text color="$color10" textAlign="center" fontSize="$2">
                Checkout belum tersedia
              </Text>
            ) : null}
          </>
        )}
      </YStack>
    ) : null;

  return (
    <TableResolveScreen
      variant={tableVariant}
      footer={footer}
      onHistoryPress={onHistoryPress}
      preparingCount={preparingCount}
    >
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
            <YStack gap="$4" flex={1}>
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

              {errorMessage ? <Text color="$red10">{errorMessage}</Text> : null}

              <ScrollView flex={1}>
                <YStack gap="$4">
                  {cart.items.map((item) => (
                    <CartLineItem
                      key={item.id}
                      item={item}
                      disabled={isMutating}
                      onAmountChange={(amount) =>
                        onAmountChange(item.id, amount)
                      }
                      onRemovePress={() => onRemovePress(item.id)}
                      onEditPress={() => onEditPress(item.id)}
                    />
                  ))}
                </YStack>
              </ScrollView>

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

      {itemEdit && <CartItemEditScreen {...itemEdit} />}
      {detailsSheet && <CustomerDetailsSheet {...detailsSheet} />}
    </TableResolveScreen>
  );
};
