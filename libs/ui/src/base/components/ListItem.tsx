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
  usePopoverContext,
} from 'tamagui';

export type PopoverMenuProps = {
  menus: ListItemMenu[];
};

export const PopoverMenu = ({ menus }: PopoverMenuProps) => {
  const { onOpenChange } = usePopoverContext();
  return (
    <YGroup width={240} size="$3">
      {menus.map((menu, index) => (
        <YGroup.Item key={index}>
          <TamaguiListItem
            icon={menu.icon}
            title={menu.title}
            onPress={(event) => {
              event.stopPropagation();
              menu.onPress();
              onOpenChange(false, 'press');
            }}
            backgroundColor="$white"
          />
        </YGroup.Item>
      ))}
    </YGroup>
  );
};

export type ListItemMenu = {
  title: string;
  icon?: NamedExoticComponent;
  onPress: () => void;
  isShown?: () => void;
};

export type ListItemFooterItem = {
  label?: string;
  icon?: NamedExoticComponent<{ size: string; color: string }>;
  value: string;
  isShown?: () => void;
};

export type ListItemProps = {
  title: string;
  subtitle?: string;
  thumbnailSrc?: string;
  menus?: ListItemMenu[];
  footerItems?: ListItemFooterItem[];
} & XStackProps;

export const ListItem = ({
  title,
  subtitle,
  thumbnailSrc,
  menus = [],
  footerItems = [],
  ...xStackProps
}: ListItemProps) => {
  const shownMenus = menus.filter(({ isShown }) =>
    isShown ? isShown() : true
  );
  const shownFooterItems = footerItems.filter(({ isShown }) =>
    isShown ? isShown() : true
  );
  return (
    <XStack
      gap="$4"
      borderRadius="$5"
      alignItems="center"
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
          <YStack flex={1} justifyContent="center">
            <H4 ellipse>{title}</H4>
            {subtitle && (
              <H5 textTransform="none" ellipse>
                {subtitle}
              </H5>
            )}
          </YStack>

          <XStack gap="$3" flexWrap="wrap">
            {shownFooterItems.map((footerItem, index) => (
              <XStack gap="$2" alignItems="center" key={index}>
                {footerItem.icon && (
                  <footerItem.icon size="$1" color="$gray11" />
                )}
                <Paragraph color="$gray11">{footerItem.value}</Paragraph>
              </XStack>
            ))}
          </XStack>
        </YStack>

        {shownMenus.length > 0 && (
          <Popover keepChildrenMounted placement="left-start">
            <Popover.Trigger
              asChild
              onPress={(event) => event.stopPropagation()}
            >
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
                'fast',
                {
                  opacity: {
                    overshootClamping: true,
                  },
                },
              ]}
            >
              <Popover.Arrow borderWidth={1} borderColor="$borderColor" />
              <PopoverMenu menus={shownMenus} />
            </Popover.Content>
          </Popover>
        )}
      </XStack>
    </XStack>
  );
};
