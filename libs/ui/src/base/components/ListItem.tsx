import { H4, H5, Image, XStack, XStackProps, YStack } from 'tamagui';

export type ListItemProps = {
  title: string;
  subtitle: string;
  thumbnailSrc?: string;
} & XStackProps;

export const ListItem = (props: ListItemProps) => {
  return (
    <XStack
      gap="$4"
      padding="$2"
      borderRadius="$5"
      alignItems="center"
      flex={1}
      elevation="$1"
      backgroundColor="$gray1"
      justifyContent="space-between"
      {...props}
    >
      <XStack alignItems="center" gap="$4" flex={1}>
        {props.thumbnailSrc && (
          <Image
            src={props.thumbnailSrc}
            width={100}
            height={100}
            borderRadius="$5"
          />
        )}

        <YStack padding="$3" flex={1}>
          <H4 ellipse>{props.title}</H4>
          <H5 ellipse>{props.subtitle}</H5>
        </YStack>
      </XStack>
    </XStack>
  );
};
