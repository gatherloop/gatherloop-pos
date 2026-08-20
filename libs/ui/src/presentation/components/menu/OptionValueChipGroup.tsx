import { Button, Text, XStack, YStack } from 'tamagui';
import { Option } from '../../../domain/entities/Product';

// FR-6 in docs/prd-table-ordering.md: one row of selectable chips per
// `Option` (Size, Ice, ...), the pesan.app-style equivalent of the
// RadioGroup TransactionItemSelect uses for the POS. Exactly one value is
// selected per option at a time — selecting a new chip in the same group
// replaces the previous selection.
export type OptionValueChipGroupProps = {
  option: Option;
  selectedOptionValueId: number | null;
  onSelectOptionValue: (optionValueId: number) => void;
  // FR-5 in docs/prd-order-app-ux-improvements.md: tints the group label red
  // when this option is one the guest pressed Tambah ke Keranjang without
  // resolving, so the error points at where to look, not just that
  // something is missing.
  hasError?: boolean;
};

export const OptionValueChipGroup = ({
  option,
  selectedOptionValueId,
  onSelectOptionValue,
  hasError = false,
}: OptionValueChipGroupProps) => {
  return (
    <YStack gap="$2">
      <Text fontWeight="bold" color={hasError ? '$red10' : undefined}>
        {option.name}
      </Text>
      <XStack flexWrap="wrap" gap="$2">
        {option.values.map((value) => (
          <Button
            key={value.id}
            size="$3"
            minHeight={44}
            borderRadius="$10"
            theme={selectedOptionValueId === value.id ? 'blue' : undefined}
            onPress={() => onSelectOptionValue(value.id)}
          >
            {value.name}
          </Button>
        ))}
      </XStack>
    </YStack>
  );
};
