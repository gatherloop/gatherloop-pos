import { Button, Text, XStack, YStack } from 'tamagui';
// Deep imports, not the `domain`/`components/base` barrels (D20): those
// barrels also re-export every POS usecase and Navbar/Sidebar — dead weight
// the customer bundle does not ship (D6).
import { Cart } from '../../../../domain/entities/Cart';
import { formatRupiah } from '../../../../utils/currency';

export type CheckoutSummaryViewProps = {
  cart: Cart;
  isPaying: boolean;
  onPayPress: () => void;
};

// FR-9/UX step 2: a read-only recap of the cart — no stepper, no edit, no
// remove, unlike `CartLineItem` — so the guest sees exactly what they're
// about to be charged before a QR (and therefore an amount) is locked in.
export const CheckoutSummaryView = ({
  cart,
  isPaying,
  onPayPress,
}: CheckoutSummaryViewProps) => (
  <YStack gap="$4" paddingBottom="$6">
    <Text fontWeight="bold" fontSize="$6">
      Ringkasan Pesanan
    </Text>

    <YStack gap="$4">
      {cart.items.map((item) => {
        const optionValueNames = item.variant.values
          .map((value) => value.optionValue.name)
          .join(', ');

        return (
          <XStack key={item.id} justifyContent="space-between" gap="$3">
            <YStack flex={1} gap="$1">
              <Text fontWeight="bold">
                {`${item.amount}x ${item.variant.product.name}`}
              </Text>
              {optionValueNames ? (
                <Text color="$color10" fontSize="$2">
                  {optionValueNames}
                </Text>
              ) : null}
              {item.note ? (
                <Text color="$color10" fontSize="$2" fontStyle="italic">
                  Catatan: {item.note}
                </Text>
              ) : null}
            </YStack>
            <Text fontWeight="bold">{formatRupiah(item.subtotal)}</Text>
          </XStack>
        );
      })}
    </YStack>

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
      // @ts-expect-error - Tamagui's type doesn't include CSS `sticky`, but
      // it passes through to the underlying web style (mirrors
      // `CartScreen`'s sticky checkout bar).
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
        disabled={isPaying}
        onPress={onPayPress}
      >
        {isPaying
          ? 'Memproses...'
          : `Bayar dengan QRIS · ${formatRupiah(cart.total)}`}
      </Button>
    </YStack>
  </YStack>
);
