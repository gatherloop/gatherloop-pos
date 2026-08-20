import { Trash2 } from '@tamagui/lucide-icons';
import { Button, Text, XStack, YStack } from 'tamagui';
// Deep imports, not the `domain`/`components/base` barrels (D20): those
// barrels also re-export every POS usecase and Navbar/Sidebar, which pull
// in solito/next — dead weight a Vite build has no business resolving.
import { CartItem } from '../../../domain/entities/Cart';
import { formatRupiah } from '../../../utils/currency';
import { AmountStepper } from '../menu/AmountStepper';
import { MenuItemThumbnail } from '../menu/MenuItemThumbnail';

// FR-7 in docs/prd-table-ordering.md: one line in the cart screen. Option
// values and note are read-only here — re-picking options or editing a note
// is an item-detail concern (FR-6); this line only ever changes quantity or
// disappears via `onRemovePress`.
//
// FR-7 in docs/prd-order-app-ux-improvements.md: the stepper and delete
// button are compacted to 32x32 here so several stacked rows don't crowd out
// the product name/options — hitSlop keeps the touch target at 44px.
export type CartLineItemProps = {
  item: CartItem;
  onAmountChange: (amount: number) => void;
  onRemovePress: () => void;
  disabled?: boolean;
};

export const CartLineItem = ({
  item,
  onAmountChange,
  onRemovePress,
  disabled = false,
}: CartLineItemProps) => {
  const optionValueNames = item.variant.values
    .map((value) => value.optionValue.name)
    .join(', ');

  const hitSlop = { top: 6, bottom: 6, left: 6, right: 6 };

  return (
    <XStack gap="$3" alignItems="flex-start">
      <MenuItemThumbnail
        imageUrl={item.variant.product.imageUrl}
        station={item.variant.product.category.station}
        width={64}
        height={64}
        flexShrink={0}
      />

      <YStack flex={1} gap="$1">
        <Text fontWeight="bold" numberOfLines={1}>
          {item.variant.product.name}
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

        <XStack
          justifyContent="space-between"
          alignItems="center"
          marginTop="$2"
          gap="$2"
        >
          <AmountStepper
            amount={item.amount}
            onChange={onAmountChange}
            disabled={disabled}
            size="sm"
          />
          <Text fontWeight="bold">{formatRupiah(item.subtotal)}</Text>
        </XStack>
      </YStack>

      <Button
        icon={Trash2}
        variant="outlined"
        theme="red"
        color="$red8"
        circular
        size="$2"
        width={32}
        height={32}
        hitSlop={hitSlop}
        disabled={disabled}
        onPress={onRemovePress}
        accessibilityLabel={`Hapus ${item.variant.product.name} dari keranjang`}
      />
    </XStack>
  );
};
