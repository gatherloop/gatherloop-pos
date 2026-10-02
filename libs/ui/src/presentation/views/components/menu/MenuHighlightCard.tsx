import { Paragraph, Text, YStack } from 'tamagui';
import { CategoryStation } from '../../../../domain/entities/Category';
import { formatRupiah } from '../../../../utils/currency';
import { MenuItemThumbnail } from './MenuItemThumbnail';

export type MenuHighlightCardProps = {
  name: string;
  variantName?: string;
  imageUrl?: string;
  station: CategoryStation;
  price: number | null;
  fullWidth?: boolean;
  onPress: () => void;
};

export const MenuHighlightCard = ({
  name,
  variantName,
  imageUrl,
  station,
  price,
  fullWidth = false,
  onPress,
}: MenuHighlightCardProps) => {
  const accessibilityLabel = variantName ? `${name} · ${variantName}` : name;

  return (
    <YStack
      width={fullWidth ? '100%' : 148}
      flexShrink={0}
      gap="$2"
      padding="$2"
      borderRadius="$6"
      backgroundColor="$color2"
      minHeight={44}
      onPress={onPress}
      cursor="pointer"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <MenuItemThumbnail
        imageUrl={imageUrl}
        station={station}
        width="100%"
        height={fullWidth ? 160 : 100}
      />
      <YStack gap="$1">
        <Text fontWeight="bold" numberOfLines={1}>
          {name}
        </Text>
        {variantName ? (
          <Paragraph size="$2" color="$color10" numberOfLines={1}>
            {variantName}
          </Paragraph>
        ) : null}
        {price !== null && <Text>{formatRupiah(price)}</Text>}
      </YStack>
    </YStack>
  );
};
