import { MoreVertical } from '@tamagui/lucide-icons';
import { NamedExoticComponent } from 'react';
import {
  Image,
  Popover,
  XStack,
  XStackProps,
  YGroup,
  YStack,
  ListItem as TamaguiListItem,
  Button,
  Paragraph,
  H4,
  H5,
} from 'tamagui';

type Menu = {
  title: string;
  onPress: () => void;
};

type FooterItem = {
  label?: string;
  icon?: NamedExoticComponent<{ size: string; color: string }>;
  value: string;
};

export type ListItemProps = {
  title: string;
  subtitle?: string;
  thumbnailSrc?: string;
  menus?: Menu[];
  footerItems?: FooterItem[];
} & XStackProps;

export const ListItem = ({
  title,
  subtitle,
  thumbnailSrc,
  menus = [],
  footerItems = [],
  ...xStackProps
}: ListItemProps) => {
  return (
    <XStack
      gap="$4"
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
            width={120}
            height={120}
            borderTopLeftRadius="$5"
            borderBottomLeftRadius="$5"
            $xs={{ display: 'none' }}
          />
        )}

        <YStack padding="$3" flex={1} gap="$3">
          <YStack>
            <H4 ellipse>{title}</H4>
            {subtitle && (
              <H5 textTransform="none" ellipse>
                {subtitle}
              </H5>
            )}
          </YStack>

          <XStack gap="$3" flexWrap="wrap">
            {footerItems.map((footerItem) => (
              <XStack gap="$2" alignItems="center">
                {footerItem.icon && (
                  <footerItem.icon size="$1" color="$gray11" />
                )}
                <Paragraph color="$gray11">{footerItem.value}</Paragraph>
              </XStack>
            ))}
          </XStack>
        </YStack>

        {menus.length > 0 && (
          <Popover>
            <Popover.Trigger onPress={(event) => event.stopPropagation()}>
              <Button
                icon={MoreVertical}
                size="$2"
                marginTop="$3"
                marginRight="$3"
                variant="outlined"
              />
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
