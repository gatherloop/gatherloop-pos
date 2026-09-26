import { useEffect, useRef, useState } from 'react';
import { Button, Text, XStack } from 'tamagui';
import { PaymentMethod } from '../../../../domain/entities/Payment';
import { formatRupiah } from '../../../../utils/currency';

export type PendingPaymentBarProps = {
  method: PaymentMethod;
  amount: number;
  expiredAt: string;
  onContinuePress: () => void;
  onCountdownElapsed: () => void;
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  qris: 'QRIS',
  cash: 'tunai',
  cod: 'COD',
};

function secondsUntil(expiredAt: string): number {
  return Math.max(
    0,
    Math.round((new Date(expiredAt).getTime() - Date.now()) / 1000)
  );
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export const PendingPaymentBar = ({
  method,
  amount,
  expiredAt,
  onContinuePress,
  onCountdownElapsed,
}: PendingPaymentBarProps) => {
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

  return (
    <XStack
      padding="$3"
      backgroundColor="$orange3"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      alignItems="center"
      justifyContent="space-between"
      gap="$3"
    >
      <Text flexShrink={1} color="$orange11" fontWeight="bold">
        {`⏳ Menunggu pembayaran ${METHOD_LABEL[method]} · ${formatRupiah(
          amount
        )} · ${formatCountdown(secondsLeft)}`}
      </Text>
      <Button theme="blue" size="$4" onPress={onContinuePress} flexShrink={0}>
        Lanjutkan pembayaran
      </Button>
    </XStack>
  );
};
