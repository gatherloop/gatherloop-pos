import { Button, Label, SizableText, XStack } from 'tamagui';
import { History } from '@tamagui/lucide-icons';
import { InputNumber, Switch } from '../base';
import { AvailabilityLevel, AvailabilityVariant } from '../../../../domain';
import { SoldOutBadge } from './SoldOutBadge';

export type AvailabilityViewHistoryPress = (
  level: AvailabilityLevel,
  id: number,
  name: string
) => void;

export type AvailabilityVariantRowProps = {
  variant: AvailabilityVariant;
  isAvailableFieldName: string;
  availableQuantityFieldName: string;
  showQuantity: boolean;
  onViewHistoryPress: AvailabilityViewHistoryPress;
};

export const AvailabilityVariantRow = ({
  variant,
  isAvailableFieldName,
  availableQuantityFieldName,
  showQuantity,
  onViewHistoryPress,
}: AvailabilityVariantRowProps) => {
  const isNegative =
    typeof variant.availableQuantity === 'number' && variant.availableQuantity < 0;

  return (
    <XStack
      gap="$3"
      alignItems="center"
      paddingVertical="$2"
      paddingHorizontal="$3"
      paddingLeft="$6"
    >
      <Switch name={isAvailableFieldName} id={isAvailableFieldName} />
      <Label flex={1} numberOfLines={1} htmlFor={isAvailableFieldName}>
        {variant.variantName}
      </Label>
      {showQuantity && (
        <InputNumber
          name={availableQuantityFieldName}
          id={availableQuantityFieldName}
          width={120}
          min={0}
          error={isNegative}
        />
      )}
      {isNegative && (
        <SizableText color="$red10" size="$2">
          Negative
        </SizableText>
      )}
      {!variant.isSellable && <SoldOutBadge label="Sold out" />}
      <Button
        icon={History}
        circular
        size="$2"
        chromeless
        onPress={() => onViewHistoryPress('variant', variant.variantId, variant.variantName)}
        accessibilityLabel={`View history for ${variant.variantName}`}
        // @ts-expect-error type is a valid HTML attribute on the underlying button
        type="button"
      />
    </XStack>
  );
};
