import { H4, H5, Image, XStack, XStackProps, YStack } from 'tamagui';

export type ListItemProps = {
  title: string;
  subtitle: string;
  thumbnailSrc?: string;
} & XStackProps;

export const ListItem = ({
  title,
  subtitle,
  thumbnailSrc,
  ...xStackProps
}: ListItemProps) => {
  return (
    <XStack
      gap="$4"
      padding="$2"
      borderRadius="$5"
      alignItems="center"
      elevation="$1"
      backgroundColor="$gray1"
      justifyContent="space-between"
      {...xStackProps}
    >
      <XStack alignItems="center" gap="$4" flex={1}>
        {thumbnailSrc && (
          <Image
            src={thumbnailSrc}
            defaultSource={{
              uri: thumbnailSrc,
            }}
            width={100}
            height={100}
            borderRadius="$5"
          />
        )}

        <YStack padding="$3" flex={1}>
          <H4 ellipse>{title}</H4>
          <H5 ellipse>{subtitle}</H5>
        </YStack>
      </XStack>
    </XStack>
  );
};
