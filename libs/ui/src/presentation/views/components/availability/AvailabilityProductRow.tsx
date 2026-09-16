import { Button, Label, SizableText, XStack, YStack } from 'tamagui';
import { History } from '@tamagui/lucide-icons';
import { InputNumber, Switch } from '../base';
import { AvailabilityProduct } from '../../../../domain';
import { AvailabilityVariantRow, AvailabilityViewHistoryPress } from './AvailabilityVariantRow';
import { SoldOutBadge } from './SoldOutBadge';

export type AvailabilityProductRowProps = {
  product: AvailabilityProduct;
  productIndex: number;
  variantIndexByVariantId: Map<number, number>;
  hidden: boolean;
  onViewHistoryPress: AvailabilityViewHistoryPress;
};

export const AvailabilityProductRow = ({
  product,
  productIndex,
  variantIndexByVariantId,
  hidden,
  onViewHistoryPress,
}: AvailabilityProductRowProps) => {
  const isAvailableFieldName = `products.${productIndex}.isAvailable`;
  const availableQuantityFieldName = `products.${productIndex}.availableQuantity`;
  const showQuantity = product.availabilityTracking === 'product';
  const isNegative =
    typeof product.availableQuantity === 'number' && product.availableQuantity < 0;

  return (
    <YStack
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$4"
      display={hidden ? 'none' : 'flex'}
    >
      <XStack gap="$3" alignItems="center" paddingVertical="$3" paddingHorizontal="$3">
        <Switch name={isAvailableFieldName} id={isAvailableFieldName} />
        <Label flex={1} htmlFor={isAvailableFieldName} numberOfLines={1}>
          {product.productName}
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
        {!product.isSellable && <SoldOutBadge label="Sold out" />}
        <Button
          icon={History}
          circular
          size="$2"
          chromeless
          onPress={() => onViewHistoryPress('product', product.productId, product.productName)}
          accessibilityLabel={`View history for ${product.productName}`}
          // @ts-expect-error type is a valid HTML attribute on the underlying button
          type="button"
        />
      </XStack>

      <YStack>
        {product.variants.map((variant) => {
          const variantIndex = variantIndexByVariantId.get(variant.variantId);
          if (variantIndex === undefined) return null;
          return (
            <AvailabilityVariantRow
              key={variant.variantId}
              variant={variant}
              isAvailableFieldName={`variants.${variantIndex}.isAvailable`}
              availableQuantityFieldName={`variants.${variantIndex}.availableQuantity`}
              showQuantity={product.availabilityTracking === 'variant'}
              onViewHistoryPress={onViewHistoryPress}
            />
          );
        })}
      </YStack>
    </YStack>
  );
};
