import { Label, SizableText, XStack } from 'tamagui';
import { InputNumber, Switch } from '../base';
import { AvailabilityVariant } from '../../../../domain';
import { SoldOutBadge } from './SoldOutBadge';

export type AvailabilityVariantRowProps = {
  variant: AvailabilityVariant;
  isAvailableFieldName: string;
  availableQuantityFieldName: string;
  showQuantity: boolean;
};

export const AvailabilityVariantRow = ({
  variant,
  isAvailableFieldName,
  availableQuantityFieldName,
  showQuantity,
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
    </XStack>
  );
};
