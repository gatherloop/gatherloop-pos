import { MoreVertical } from '@tamagui/lucide-icons';
import {
  H4,
  H5,
  Image,
  Popover,
  XStack,
  XStackProps,
  YGroup,
  YStack,
  ListItem as TamaguiListItem,
  Button,
} from 'tamagui';

type Menu = {
  title: string;
  onPress: () => void;
};

export type ListItemProps = {
  title: string;
  subtitle?: string;
  thumbnailSrc?: string;
  menus: Menu[];
} & XStackProps;

export const ListItem = ({
  title,
  subtitle,
  thumbnailSrc,
  menus,
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
      <XStack alignItems="flex-start" gap="$4" flex={1}>
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
          {subtitle && <H5 ellipse>{subtitle}</H5>}
        </YStack>

        {menus.length > 0 && (
          <Popover>
            <Popover.Trigger onPress={(event) => event.stopPropagation()}>
              <Button icon={MoreVertical} size="$2" variant="outlined" />
            </Popover.Trigger>

            <Popover.Content
              borderWidth={1}
              borderColor="$borderColor"
              enterStyle={{ y: -10, opacity: 0 }}
              exitStyle={{ y: -10, opacity: 0 }}
              elevate
              padding="$0"
              animation={[
                'quick',
                {
                  opacity: {
                    overshootClamping: true,
                  },
                },
              ]}
            >
              <Popover.Arrow borderWidth={1} borderColor="$borderColor" />

              <YGroup alignSelf="flex-start" bordered width={240} size="$4">
                {menus.map((menu, index) => (
                  <YGroup.Item key={index}>
                    <Popover.Close asChild>
                      <TamaguiListItem
                        hoverTheme
                        onPress={(event) => {
                          event.stopPropagation();
                          menu.onPress();
                        }}
                      >
                        {menu.title}
                      </TamaguiListItem>
                    </Popover.Close>
                  </YGroup.Item>
                ))}
              </YGroup>
            </Popover.Content>
          </Popover>
        )}
      </XStack>
    </XStack>
  );
};
