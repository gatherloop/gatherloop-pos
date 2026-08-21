import { MoreVertical } from '@tamagui/lucide-icons';
import { NamedExoticComponent, ReactNode } from 'react';
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

// FR-11 in docs/prd-transaction-mobile-ux.md: an inline action rendered next
// to the row menu on `$xs` only, so the most frequent mobile action isn't
// two taps deep in a popover. Above `$xs` the menu already exposes it.
export type ListItemPrimaryAction = {
  label: string;
  icon?: NamedExoticComponent;
  onPress: () => void;
  isShown?: boolean;
};

export type ListItemProps = {
  title: string;
  subtitle?: ReactNode;
  thumbnailSrc?: string;
  menus?: ListItemMenu[];
  footerItems?: ListItemFooterItem[];
  primaryAction?: ListItemPrimaryAction;
} & XStackProps;

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export const ListItem = ({
  title,
  subtitle,
  thumbnailSrc,
  menus = [],
  footerItems = [],
  primaryAction,
  ...xStackProps
}: ListItemProps) => {
  const shownMenus = menus.filter(({ isShown }) => isShown ?? true);
  const shownFooterItems = footerItems.filter(({ isShown }) => isShown ?? true);
  const showPrimaryAction = primaryAction ? primaryAction.isShown ?? true : false;
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

        <YStack padding="$3" flex={1} gap="$3" $xs={{ gap: '$2' }}>
          <YStack flex={1} justifyContent="center">
            <H4 ellipse $xs={{ size: '$5' }}>
              {title}
            </H4>
            {subtitle &&
              (typeof subtitle === 'string' ? (
                <Paragraph
                  textTransform="none"
                  ellipse
                  size="$6"
                  $xs={{ size: '$4' }}
                >
                  {subtitle}
                </Paragraph>
              ) : (
                subtitle
              ))}
          </YStack>

          {shownFooterItems.length > 0 ? (
            <>
              <Separator />

              <XStack gap="$3" $xs={{ gap: '$2' }} flexWrap="wrap">
                {shownFooterItems.map((footerItem, index) => (
                  <XStack
                    key={index}
                    gap="$2"
                    alignItems={footerItem.label ? 'flex-start' : 'center'}
                    $xs={{ alignItems: 'center' }}
                  >
                    {footerItem.icon && (
                      <YStack
                        theme="active"
                        backgroundColor="$background"
                        padding="$2"
                        justifyContent="center"
                        alignItems="center"
                        borderRadius="$12"
                        $xs={{ display: 'none' }}
                      >
                        <footerItem.icon size="$1" color="$gray12" />
                      </YStack>
                    )}
                    <YStack $xs={{ display: 'none' }}>
                      <Paragraph fontWeight="bold" color="$gray12">
                        {footerItem.label}
                      </Paragraph>
                      <Paragraph color="$gray12">
                        {footerItem.value}
                      </Paragraph>
                    </YStack>
                    <Paragraph
                      display="none"
                      color="$gray12"
                      size="$2"
                      $xs={{ display: 'flex' }}
                    >
                      {footerItem.label
                        ? `${footerItem.label}: ${footerItem.value}`
                        : footerItem.value}
                    </Paragraph>
                  </XStack>
                ))}
              </XStack>
            </>
          ) : null}
        </YStack>

        {(shownMenus.length > 0 || showPrimaryAction) && (
          <XStack gap="$2" alignItems="center" marginTop="$3" marginRight="$3">
            {showPrimaryAction && primaryAction && (
              <Button
                display="none"
                $xs={{ display: 'flex' }}
                size="$3"
                theme="active"
                icon={primaryAction.icon}
                onPress={(event) => {
                  event.stopPropagation();
                  primaryAction.onPress();
                }}
              >
                {primaryAction.label}
              </Button>
            )}

            {shownMenus.length > 0 && (
              <Popover keepChildrenMounted placement="left-start">
                <Popover.Trigger
                  asChild
                  onPress={(event) => event.stopPropagation()}
                >
                  <Button
                    icon={MoreVertical}
                    size="$3"
                    variant="outlined"
                    hitSlop={HIT_SLOP}
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
        )}
      </XStack>
    </XStack>
  );
};
