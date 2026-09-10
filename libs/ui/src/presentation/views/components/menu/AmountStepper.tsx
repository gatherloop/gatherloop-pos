import { Minus, Plus } from '@tamagui/lucide-icons';
import { Button, Text, XStack } from 'tamagui';

export type AmountStepperProps = {
  amount: number;
  onChange: (amount: number) => void;
  min?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
};

const SM_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 };

export const AmountStepper = ({
  amount,
  onChange,
  min = 1,
  disabled = false,
  size = 'md',
}: AmountStepperProps) => {
  const buttonSize = size === 'sm' ? 32 : 44;

  return (
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
        disabled={disabled}
        onPress={() => onChange(amount + 1)}
        accessibilityLabel="Tambah jumlah"
      />
    </XStack>
  );
};
