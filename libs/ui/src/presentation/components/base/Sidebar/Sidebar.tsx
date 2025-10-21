import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from '@tamagui/lucide-icons';
import {
  Accordion,
  Button,
  H5,
  ListItem,
  Paragraph,
  Square,
  XStack,
  YGroup,
  YStack,
} from 'tamagui';
import { useSidebarState } from './Sidebar.state';
import { Link } from 'solito/link';

export type SidebarProps = {
  onLogoutPress: () => void;
};

export const Sidebar = (props: SidebarProps) => {
  const {
    isShown,
    onToggleButtonPress,
    router,
    items,
    accordionValue,
    setAccordionValue,
    currentPath,
  } = useSidebarState();

  return (
    <>
      <YGroup
        width={200}
        $xs={{ position: 'absolute', top: 0, bottom: 0, zIndex: '$5' }}
        elevation="$1"
        backgroundColor="$gray3"
        borderRadius="$0"
        marginLeft={isShown ? 0 : -200}
      >
        <YStack flex={1} justifyContent="space-between">
          <YStack gap="$3">
            <XStack padding="$3" paddingBottom="$0">
              <H5>Gatherloop POS</H5>
            </XStack>

            <Accordion
              overflow="hidden"
              type="single"
              value={accordionValue}
              onValueChange={setAccordionValue}
            >
              {items.map((item) => (
                <Accordion.Item value={item.title} key={item.title}>
                  <Accordion.Trigger
                    flexDirection="row"
                    justifyContent="space-between"
                    backgroundColor="$gray3"
                    onPress={(event) => {
                      if (item.path) {
                        event.preventDefault();
                        router.push(item.path);
                      }
                    }}
                  >
                    {({ open }: { open: boolean }) => (
                      <>
                        <XStack gap="$3">
                          <item.icon size="$1" />
                          <Paragraph>{item.title}</Paragraph>
                        </XStack>
                        {item.subItems && (
                          <Square
                            animation="quick"
                            rotate={open ? '180deg' : '0deg'}
                          >
                            <ChevronDown size="$1" />
                          </Square>
                        )}
                      </>
                    )}
                  </Accordion.Trigger>

                  {item.subItems && (
                    <Accordion.HeightAnimator animation="medium">
                      <Accordion.Content
                        animation="medium"
                        exitStyle={{ opacity: 0 }}
                        backgroundColor="$gray3"
                      >
                        {item.subItems.map((subItem, index) => (
                          <YGroup.Item key={index}>
                            <Link href={subItem.path}>
                              <ListItem
                                backgroundColor={
                                  subItem.path === currentPath
                                    ? undefined
                                    : '$colorTransparent'
                                }
                                hoverTheme
                                size="$4"
                                cursor="pointer"
                              >
                                {subItem.title}
                              </ListItem>
                            </Link>
                          </YGroup.Item>
                        ))}
                      </Accordion.Content>
                    </Accordion.HeightAnimator>
                  )}
                </Accordion.Item>
              ))}
            </Accordion>
          </YStack>

          <YStack padding="$3" paddingTop="$0">
            <Button
              onPress={props.onLogoutPress}
              icon={LogOut}
              variant="outlined"
            >
              Logout
            </Button>
          </YStack>
        </YStack>
      </YGroup>

      {!isShown && (
        <Button
          icon={isShown ? ChevronsLeft : ChevronsRight}
          onPress={onToggleButtonPress}
          position="absolute"
          left={isShown ? 200 : 0}
          zIndex={999}
          animation="fast"
          size="$3"
          borderTopLeftRadius="$0"
          borderBottomLeftRadius="$0"
          bottom="$20"
          borderWidth="$0"
          theme="blue"
        ></Button>
      )}
    </>
  );
};
