import { useEffect, useState } from 'react';
import { Button, Paragraph, SizableText, Text, XStack, YStack } from 'tamagui';
import { PaymentItem } from '../../../../domain/entities/Payment';
import { OrderItemsSummary } from './OrderItemsSummary';

const ELLIPSIS_FRAMES = ['', '.', '..', '...'];
const ELLIPSIS_INTERVAL_MS = 500;
const RING_PULSE_INTERVAL_MS = 900;
const NUMBER_BADGE_SIZE = 140;
const NUMBER_BADGE_RING_SIZE = 170;

const transactionNumberFontSizeByDigitCount: Record<number, string> = {
  1: '$12',
  2: '$11',
  3: '$10',
  4: '$9',
};

const PreparingNumberBadge = ({ value }: { value: number }) => {
  const [isRingExpanded, setIsRingExpanded] = useState(false);

  useEffect(() => {
    const timerId = setInterval(() => {
      setIsRingExpanded((previous) => !previous);
    }, RING_PULSE_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, []);

  const digitCount = value.toString().length;
  const fontSize =
    transactionNumberFontSizeByDigitCount[digitCount] ??
    transactionNumberFontSizeByDigitCount[4];

  return (
    <YStack
      width={NUMBER_BADGE_RING_SIZE}
      height={NUMBER_BADGE_RING_SIZE}
      alignItems="center"
      justifyContent="center"
    >
      <YStack
        position="absolute"
        width={NUMBER_BADGE_RING_SIZE}
        height={NUMBER_BADGE_RING_SIZE}
        borderRadius={NUMBER_BADGE_RING_SIZE / 2}
        borderWidth={3}
        borderColor="$orange8"
        animation="slow"
        opacity={isRingExpanded ? 0.1 : 0.6}
        scale={isRingExpanded ? 1.15 : 1}
      />
      <YStack
        width={NUMBER_BADGE_SIZE}
        height={NUMBER_BADGE_SIZE}
        borderRadius={NUMBER_BADGE_SIZE / 2}
        backgroundColor="$orange5"
        alignItems="center"
        justifyContent="center"
      >
        <SizableText color="$orange11" fontSize={fontSize} fontWeight="bold">
          #{value}
        </SizableText>
      </YStack>
    </YStack>
  );
};

const PollFlashDot = ({ isPolling }: { isPolling: boolean }) => (
  <YStack
    width={8}
    height={8}
    borderRadius={4}
    backgroundColor="$green9"
    animation="quick"
    opacity={isPolling ? 1 : 0}
    testID="poll-flash-dot"
  />
);

const PreparingHeading = ({ isPolling }: { isPolling: boolean }) => {
  const [ellipsisFrame, setEllipsisFrame] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => {
      setEllipsisFrame((previous) => (previous + 1) % ELLIPSIS_FRAMES.length);
    }, ELLIPSIS_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, []);

  return (
    <XStack alignItems="center" gap="$2">
      <Text fontWeight="bold" fontSize="$6" textAlign="center">
        {`Sedang disiapkan${ELLIPSIS_FRAMES[ellipsisFrame]}`}
      </Text>
      <PollFlashDot isPolling={isPolling} />
    </XStack>
  );
};

export type OrderPreparingViewProps = {
  transactionNumber: number;
  tableLabel: string;
  items: PaymentItem[];
  amount: number;
  isPolling: boolean;
  onBackToMenuPress: () => void;
};

export const OrderPreparingView = ({
  transactionNumber,
  tableLabel,
  items,
  amount,
  isPolling,
  onBackToMenuPress,
}: OrderPreparingViewProps) => (
  <YStack flex={1} gap="$4" alignItems="center">
    <PreparingNumberBadge value={transactionNumber} />
    <PreparingHeading isPolling={isPolling} />

    <YStack alignItems="center" gap="$1">
      <Text color="$color10">Meja</Text>
      <Text fontWeight="bold" fontSize="$10" textAlign="center">
        {tableLabel}
      </Text>
    </YStack>

    <OrderItemsSummary items={items} amount={amount} />

    <Paragraph textAlign="center" color="$color10">
      Pesanan Anda sedang disiapkan. Mohon tunggu di meja Anda, kami akan
      memberi tahu di halaman ini saat pesanan siap diambil.
    </Paragraph>

    <Button theme="blue" size="$5" minHeight={44} onPress={onBackToMenuPress}>
      Pesan lagi
    </Button>
  </YStack>
);
