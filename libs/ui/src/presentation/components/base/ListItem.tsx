import { MoreVertical } from '@tamagui/lucide-icons';
import React, { NamedExoticComponent, ReactNode } from 'react';
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
  usePopoverContext,
  Separator,
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
              if (menu.onPress) menu.onPress();
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
  onPress?: () => void;
  isShown?: boolean;
};

export type ListItemFooterItem = {
  label?: string;
  icon?: NamedExoticComponent<{ size: string; color: string }>;
  value: string;
  isShown?: boolean;
};

export type ListItemProps = {
  title: string;
  subtitle?: ReactNode;
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
  const shownMenus = menus.filter(({ isShown }) => isShown ?? true);
  const shownFooterItems = footerItems.filter(({ isShown }) => isShown ?? true);
  return (
    <XStack
      gap="$4"
      borderRadius="$5"
      alignItems="center"
      backgroundColor="$gray1"
      justifyContent="space-between"
      {...xStackProps}
    >
      <YStack padding="$3" flex={1} gap="$3">
        <XStack alignItems="flex-start" justifyContent="space-between" flex={1}>
          <XStack alignItems="flex-start" gap="$3">
            {thumbnailSrc && (
              <Image
                src={thumbnailSrc}
                defaultSource={{
                  uri: thumbnailSrc,
                  width: 60,
                  height: 60,
                }}
                width={60}
                height={60}
                borderRadius="$5"
              />
            )}
            <YStack justifyContent="center">
              <H4 ellipse>{title}</H4>
              {subtitle &&
                (typeof subtitle === 'string' ? (
                  <Paragraph textTransform="none" ellipse size="$6">
                    {subtitle}
                  </Paragraph>
                ) : (
                  subtitle
                ))}
            </YStack>
          </XStack>

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

        {shownFooterItems.length > 0 ? (
          <>
            <Separator />

            <XStack gap="$3" flexWrap="wrap">
              {shownFooterItems.map((footerItem, index) => (
                <XStack
                  gap="$2"
                  alignItems={footerItem.label ? 'flex-start' : 'center'}
                  key={index}
                >
                  {footerItem.icon && (
                    <YStack
                      theme="active"
                      backgroundColor="$background"
                      padding="$2"
                      justifyContent="center"
                      alignItems="center"
                      borderRadius="$12"
                    >
                      <footerItem.icon size="$1" color="$gray12" />
                    </YStack>
                  )}
                  <YStack>
                    <Paragraph color="$gray12" fontSize="$1">
                      {footerItem.label}
                    </Paragraph>
                    <Paragraph color="$gray12" size="$1">
                      {footerItem.value}
                    </Paragraph>
                  </YStack>
                </XStack>
              ))}
            </XStack>
          </>
        ) : null}
      </YStack>
    </XStack>
  );
};
