import { Minus, Plus } from '@tamagui/lucide-icons';
import { Button, Text, XStack, YStack } from 'tamagui';

export type AmountStepperProps = {
  amount: number;
  onChange: (amount: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
};

const SM_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

export const AmountStepper = ({
  amount,
  onChange,
  min = 1,
  max,
  disabled = false,
  size = 'md',
}: AmountStepperProps) => {
  const buttonSize = size === 'sm' ? 32 : 44;
  const isAtCap = max !== undefined && amount >= max;

  return (
    <YStack gap="$1">
      <XStack gap={size === 'sm' ? '$2' : '$3'} alignItems="center">
        <Button
          icon={Minus}
          variant="outlined"
          circular
          size={size === 'sm' ? '$2' : undefined}
          width={buttonSize}
          height={buttonSize}
          hitSlop={size === 'sm' ? SM_HIT_SLOP : undefined}
          disabled={disabled || amount <= min}
          onPress={() => onChange(amount - 1)}
          accessibilityLabel="Kurangi jumlah"
        />
        <Text fontSize="$5" fontWeight="bold" minWidth={24} textAlign="center">
          {amount}
        </Text>
        <Button
          icon={Plus}
          variant="outlined"
          circular
          size={size === 'sm' ? '$2' : undefined}
          width={buttonSize}
          height={buttonSize}
          hitSlop={size === 'sm' ? SM_HIT_SLOP : undefined}
          disabled={disabled || isAtCap}
          onPress={() => onChange(amount + 1)}
          accessibilityLabel="Tambah jumlah"
        />
      </XStack>
      {isAtCap ? (
        <Text color="$color10" fontSize="$1">
          Sisa {max}
        </Text>
      ) : null}
    </YStack>
  );
};
