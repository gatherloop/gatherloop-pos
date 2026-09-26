import { useEffect, useRef, useState } from 'react';
import { Paragraph, ScrollView, SizableText, Text, YStack } from 'tamagui';
import { PaymentItem } from '../../../../domain/entities/Payment';
import { OrderItemsSummary } from '../orderStatus/OrderItemsSummary';

export type CodVerificationViewProps = {
  transactionNumber: number;
  items: PaymentItem[];
  amount: number;
  expiredAt: string;
  onCountdownElapsed: () => void;
};

const NUMBER_BADGE_SIZE = 120;

function secondsUntil(expiredAt: string): number {
  return Math.max(
    0,
    Math.round((new Date(expiredAt).getTime() - Date.now()) / 1000)
  );
}

export const CodVerificationView = ({
  transactionNumber,
  items,
  amount,
  expiredAt,
  onCountdownElapsed,
}: CodVerificationViewProps) => {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(expiredAt));
  const hasElapsed = useRef(false);

  useEffect(() => {
    const timerId = setInterval(() => {
      setSecondsLeft(secondsUntil(expiredAt));
    }, 1000);
    return () => clearInterval(timerId);
  }, [expiredAt]);

  useEffect(() => {
    if (secondsLeft === 0 && !hasElapsed.current) {
      hasElapsed.current = true;
      onCountdownElapsed();
    }
  }, [secondsLeft, onCountdownElapsed]);

  const minutesLeft = Math.max(1, Math.ceil(secondsLeft / 60));

  return (
    <YStack flex={1} gap="$4" alignItems="center">
      <YStack
        width={NUMBER_BADGE_SIZE}
        height={NUMBER_BADGE_SIZE}
        borderRadius={NUMBER_BADGE_SIZE / 2}
        backgroundColor="$orange5"
        alignItems="center"
        justifyContent="center"
      >
        <SizableText color="$orange11" fontSize="$10" fontWeight="bold">
          #{transactionNumber}
        </SizableText>
      </YStack>

      <Text fontWeight="bold" fontSize="$6" textAlign="center">
        Menunggu konfirmasi barista…
      </Text>

      <ScrollView flex={1}>
        <OrderItemsSummary items={items} amount={amount} />
      </ScrollView>

      <Paragraph textAlign="center" color="$color10">
        {`Pesanan akan dibuat setelah barista mengonfirmasi. Jika tidak dikonfirmasi dalam ${minutesLeft} menit, pesanan dibatalkan otomatis.`}
      </Paragraph>
    </YStack>
  );
};
