import { CheckCircle } from '@tamagui/lucide-icons';
import { SizableText, Text, YStack } from 'tamagui';

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
};

export const OrderReadyView = ({ transactionNumber }: OrderReadyViewProps) => (
  <YStack flex={1} gap="$4" alignItems="center" justifyContent="center">
    <CheckCircle size="$6" color="$green10" />
    <ReadyNumberBadge value={transactionNumber} />
    <Text fontWeight="bold" fontSize="$6" textAlign="center">
      Pesanan siap!
    </Text>
    <Text textAlign="center" color="$color10">
      {`Silakan ambil di kasir dengan menyebutkan nomor #${transactionNumber}.`}
    </Text>
  </YStack>
);
