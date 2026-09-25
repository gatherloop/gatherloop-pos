import { useEffect, useRef, useState } from 'react';
import {
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  Text,
  XStack,
  YStack,
} from 'tamagui';
import { PaymentItem } from '../../../../domain/entities/Payment';
import { formatRupiah } from '../../../../utils/currency';
import { OrderItemsSummary } from '../orderStatus/OrderItemsSummary';

export type CashPaymentViewProps = {
  cashierLocation: string;
  transactionNumber: number;
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

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export const CashPaymentView = ({
  cashierLocation,
  transactionNumber,
  amount,
  expiredAt,
  onCountdownElapsed,
}: CashPaymentViewProps) => {
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
    <YStack flex={1} alignItems="center" gap="$4" paddingVertical="$4">
      <Text fontWeight="bold" fontSize="$8">
        {formatRupiah(amount)}
      </Text>
      <Text fontSize="$6" textAlign="center">
        {`Bayar di kasir ${cashierLocation}`}
      </Text>

      <Text fontWeight="bold" textAlign="center" fontSize="$5">
        {secondsLeft > 0
          ? `Selesaikan pembayaran dalam ${formatCountdown(secondsLeft)}`
          : 'Memeriksa status pembayaran...'}
      </Text>

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

      <Paragraph textAlign="center" color="$color10">
        Tunjukkan nomor pesanan ini ke kasir. Pesanan akan dibatalkan otomatis
        jika belum dibayar.
      </Paragraph>
    </YStack>
  );
};
