import { Pencil, Trash2 } from '@tamagui/lucide-icons';
import { Button, Paragraph, Text, XStack, YStack } from 'tamagui';
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
  readOnly?: boolean;
};

const SoldOutBadge = () => (
  <XStack
    backgroundColor="$red5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Paragraph size="$1" color="$red11">
      Habis
    </Paragraph>
  </XStack>
);

export const CartLineItem = ({
  item,
  onAmountChange,
  onRemovePress,
  onEditPress,
  disabled = false,
  readOnly = false,
}: CartLineItemProps) => {
  const optionValueNames = item.variant.values
    .map((value) => value.optionValue.name)
    .join(', ');

  const isSoldOut = !item.variant.isSellable;
  const remainingQuantity = item.variant.sellableQuantity;

  const hitSlop = { top: 6, bottom: 6, left: 6, right: 6 };

  return (
    <XStack gap="$3">
      <MenuItemThumbnail
        imageUrl={item.variant.product.imageUrl}
        station={item.variant.product.category.station}
        width={64}
        height={64}
        flexShrink={0}
      />

      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$2">
          <Text fontWeight="bold" numberOfLines={1} flexShrink={1}>
            {item.variant.product.name}
          </Text>
          {isSoldOut ? <SoldOutBadge /> : null}
        </XStack>

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
          {readOnly ? (
            <Text fontSize="$5" fontWeight="bold">
              {`${item.amount}x`}
            </Text>
          ) : (
            <AmountStepper
              amount={item.amount}
              onChange={onAmountChange}
              max={remainingQuantity}
              disabled={disabled || isSoldOut}
              size="sm"
            />
          )}
        </XStack>
      </YStack>

      <YStack gap="$2" justifyContent="space-between">
        {readOnly ? null : (
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
        )}

        <Text fontWeight="bold" marginBottom="$2">
          {formatRupiah(item.subtotal)}
        </Text>
      </YStack>
    </XStack>
  );
};
