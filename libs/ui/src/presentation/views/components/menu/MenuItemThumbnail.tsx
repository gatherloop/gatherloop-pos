import { Coffee, Tag, Utensils } from '@tamagui/lucide-icons';
import { NamedExoticComponent, useState } from 'react';
import { Image, YStack, YStackProps } from 'tamagui';
import { CategoryStation } from '../../../../domain';

const stationIcon: Record<CategoryStation, NamedExoticComponent<{ size?: number | string; color?: string }>> = {
  KITCHEN: Utensils,
  BAR: Coffee,
  NONE: Tag,
};

export type MenuItemThumbnailProps = {
  imageUrl?: string;
  station: CategoryStation;
} & YStackProps;

export const MenuItemThumbnail = ({
  imageUrl,
  station,
  ...yStackProps
}: MenuItemThumbnailProps) => {
  const [hasFailedToLoad, setHasFailedToLoad] = useState(false);
  const showImage = Boolean(imageUrl) && !hasFailedToLoad;
  const StationIcon = stationIcon[station];

  return (
    <YStack
      backgroundColor="$color4"
      borderRadius="$4"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      {...yStackProps}
    >
      {showImage ? (
        <Image
          src={imageUrl}
          width="100%"
          height="100%"
          objectFit="cover"
          onError={() => setHasFailedToLoad(true)}
        />
      ) : (
        <StationIcon size="$2" color="$color10" />
      )}
    </YStack>
  );
};
