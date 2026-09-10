import { Pencil, Trash2 } from '@tamagui/lucide-icons';
import { Button, Text, XStack, YStack } from 'tamagui';
import { CartItem } from '../../../../domain/entities/Cart';
import { formatRupiah } from '../../../../utils/currency';
import { AmountStepper } from '../menu/AmountStepper';
import { MenuItemThumbnail } from '../menu/MenuItemThumbnail';

export type CartLineItemProps = {
  item: CartItem;
  onAmountChange: (amount: number) => void;
  onRemovePress: () => void;
  onEditPress: () => void;
  disabled?: boolean;
};

export const CartLineItem = ({
  item,
  onAmountChange,
  onRemovePress,
  onEditPress,
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

      <XStack gap="$2">
        <Button
          icon={Pencil}
          variant="outlined"
          circular
          size="$2"
          width={32}
          height={32}
          hitSlop={hitSlop}
          disabled={disabled}
          onPress={onEditPress}
          accessibilityLabel={`Ubah ${item.variant.product.name}`}
        />

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
    </XStack>
  );
};
