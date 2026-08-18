import { Minus, Plus } from '@tamagui/lucide-icons';
import { Button, Text, XStack } from 'tamagui';

// FR-6 in docs/prd-table-ordering.md: the quantity stepper on the item
// detail sheet. `min` mirrors the usecase's own floor (CHANGE_AMOUNT clamps
// to 1) so the decrement button disables in lockstep with what the machine
// would clamp anyway, rather than allowing a press that visibly no-ops.
export type AmountStepperProps = {
  amount: number;
  onChange: (amount: number) => void;
  min?: number;
  disabled?: boolean;
};

export const AmountStepper = ({
  amount,
  onChange,
  min = 1,
  disabled = false,
}: AmountStepperProps) => {
  return (
    <XStack gap="$3" alignItems="center">
      <Button
        icon={Minus}
        variant="outlined"
        circular
        width={44}
        height={44}
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
        width={44}
        height={44}
        disabled={disabled}
        onPress={() => onChange(amount + 1)}
        accessibilityLabel="Tambah jumlah"
      />
    </XStack>
  );
};
