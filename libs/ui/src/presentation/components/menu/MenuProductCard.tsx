import { Paragraph, Text, XStack, YStack } from 'tamagui';
import { Product } from '../../../domain/entities/Product';
import { formatRupiah } from '../../../utils/currency';
import { MenuItemThumbnail } from './MenuItemThumbnail';

// FR-5 in docs/prd-table-ordering.md: one card per product in the menu
// list. `startingPrice` is the lowest resolved variant price for this
// product (D15's formatRupiah, "mulai Rp X") — `null` when no variant of
// this product could be found, which the card renders by simply omitting
// the price line rather than showing a broken value.
export type MenuProductCardProps = {
  product: Product;
  startingPrice: number | null;
  onPress: () => void;
};

export const MenuProductCard = ({
  product,
  startingPrice,
  onPress,
}: MenuProductCardProps) => {
  return (
    <XStack
      gap="$3"
      padding="$3"
      borderRadius="$6"
      backgroundColor="$color2"
      alignItems="center"
      minHeight={44}
      onPress={onPress}
      cursor="pointer"
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      <MenuItemThumbnail
        imageUrl={product.imageUrl}
        station={product.category.station}
        width={72}
        height={72}
        flexShrink={0}
      />

      <YStack flex={1} gap="$1">
        <Text fontWeight="bold" numberOfLines={1}>
          {product.name}
        </Text>

        {product.description ? (
          <Paragraph size="$2" color="$color10" numberOfLines={2}>
            {product.description}
          </Paragraph>
        ) : null}

        {startingPrice !== null && (
          <Text color="$blue10" fontWeight="600">
            mulai {formatRupiah(startingPrice)}
          </Text>
        )}
      </YStack>
    </XStack>
  );
};
