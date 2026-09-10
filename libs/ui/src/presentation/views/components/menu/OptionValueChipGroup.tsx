import { Button, Text, XStack, YStack } from 'tamagui';
import { Option } from '../../../../domain/entities/Product';

export type OptionValueChipGroupProps = {
  option: Option;
  selectedOptionValueId: number | null;
  onSelectOptionValue: (optionValueId: number) => void;
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
