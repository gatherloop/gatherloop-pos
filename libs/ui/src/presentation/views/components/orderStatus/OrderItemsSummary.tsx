import { Text, XStack, YStack } from 'tamagui';
import { PaymentItem } from '../../../../domain/entities/Payment';
import { formatRupiah } from '../../../../utils/currency';

export type OrderItemsSummaryProps = {
  items: PaymentItem[];
  amount: number;
};

export const OrderItemsSummary = ({ items, amount }: OrderItemsSummaryProps) => (
  <YStack width="100%" gap="$4">
    {items.map((item, index) => {
      const optionValueNames = item.options
        .map((option) => option.value)
        .join(', ');

      return (
        <XStack
          key={`${item.name}-${index}`}
          justifyContent="space-between"
          gap="$3"
        >
          <YStack flex={1} gap="$1">
            <Text fontWeight="bold">{`${item.amount}x ${item.name}`}</Text>
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

    <XStack justifyContent="space-between">
      <Text fontWeight="bold">Total</Text>
      <Text fontWeight="bold">{formatRupiah(amount)}</Text>
    </XStack>
  </YStack>
);
