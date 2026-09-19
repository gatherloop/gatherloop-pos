import { Paragraph, Text, XStack, YStack } from 'tamagui';
import { Product } from '../../../../domain/entities/Product';
import { formatRupiah } from '../../../../utils/currency';
import { MenuItemThumbnail } from './MenuItemThumbnail';

export type MenuProductCardProps = {
  product: Product;
  startingPrice: number | null;
  onPress: () => void;
};

const SoldOutBadge = () => (
  <XStack
    backgroundColor="$red5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Paragraph size="$1" color="$red11">
      Habis
    </Paragraph>
  </XStack>
);

export const MenuProductCard = ({
  product,
  startingPrice,
  onPress,
}: MenuProductCardProps) => {
  const isSellable = product.isSellable;

  return (
    <XStack
      gap="$3"
      padding="$3"
      borderRadius="$6"
      backgroundColor="$color2"
      alignItems="center"
      minHeight={44}
      opacity={isSellable ? 1 : 0.5}
      onPress={isSellable ? onPress : undefined}
      cursor={isSellable ? 'pointer' : 'not-allowed'}
      accessibilityRole="button"
      accessibilityLabel={product.name}
      accessibilityState={{ disabled: !isSellable }}
    >
      <MenuItemThumbnail
        imageUrl={product.imageUrl}
        station={product.category.station}
        width={72}
        height={72}
        flexShrink={0}
      />

      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$2">
          <Text fontWeight="bold" numberOfLines={1} flexShrink={1}>
            {product.name}
          </Text>
          {!isSellable && <SoldOutBadge />}
        </XStack>

        {product.description ? (
          <Paragraph size="$2" color="$color10" numberOfLines={2}>
            {product.description}
          </Paragraph>
        ) : null}

        {startingPrice !== null && <Text>{formatRupiah(startingPrice)}</Text>}
      </YStack>
    </XStack>
  );
};
