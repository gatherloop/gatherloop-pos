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
  // FR-7 in docs/prd-order-app-ux-improvements.md: 'sm' is the cart row's
  // compact 32x32 button; 'md' (default) stays the item detail sheet's
  // original 44x44. One component, no `CartAmountStepper` fork (Core Rule 4).
  size?: 'sm' | 'md';
};

// 32px is the accepted floor for a secondary control; hitSlop pads the
// touch target back up to the 44px ideal without growing the visible button.
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
