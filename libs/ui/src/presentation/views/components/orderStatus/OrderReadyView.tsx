import { CheckCircle2 } from '@tamagui/lucide-icons';
import { ScrollView, SizableText, Text, XStack, YStack } from 'tamagui';
import { PaymentItem } from '../../../../domain/entities/Payment';
import { OrderItemsSummary } from './OrderItemsSummary';

const NUMBER_BADGE_SIZE = 140;

const transactionNumberFontSizeByDigitCount: Record<number, string> = {
  1: '$12',
  2: '$11',
  3: '$10',
  4: '$9',
};

const ReadyNumberBadge = ({ value }: { value: number }) => {
  const digitCount = value.toString().length;
  const fontSize =
    transactionNumberFontSizeByDigitCount[digitCount] ??
    transactionNumberFontSizeByDigitCount[4];

  return (
    <YStack
      width={NUMBER_BADGE_SIZE}
      height={NUMBER_BADGE_SIZE}
      borderRadius={NUMBER_BADGE_SIZE / 2}
      backgroundColor="$green5"
      alignItems="center"
      justifyContent="center"
    >
      <SizableText color="$green11" fontSize={fontSize} fontWeight="bold">
        #{value}
      </SizableText>
    </YStack>
  );
};

export type OrderReadyViewProps = {
  transactionNumber: number;
  items: PaymentItem[];
  amount: number;
};

export const OrderReadyView = ({
  transactionNumber,
  items,
  amount,
}: OrderReadyViewProps) => (
  <YStack flex={1} gap="$4" alignItems="center">
    <ReadyNumberBadge value={transactionNumber} />
    <XStack gap="$2" alignItems="center">
      <Text fontWeight="bold" fontSize="$6" textAlign="center">
        Pesanan siap
      </Text>
      <CheckCircle2 size="$2" color="$green10" />
    </XStack>

    <Text textAlign="center" color="$color10">
      Silakan ambil di kasir
    </Text>
    <ScrollView flex={1}>
      <OrderItemsSummary items={items} amount={amount} />
    </ScrollView>
  </YStack>
);
