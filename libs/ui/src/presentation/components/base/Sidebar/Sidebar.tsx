import {
  Box,
  Calculator,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  CreditCard,
  FileBox,
  Fullscreen,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Tag,
  Wallet,
} from '@tamagui/lucide-icons';
import { Button, H3, ListItem, YGroup, YStack } from 'tamagui';
import { useSidebarState } from './Sidebar.state';
import { NamedExoticComponent } from 'react';
import { Platform } from 'react-native';
import { Link } from 'solito/link';

const items: { title: string; icon: NamedExoticComponent; path: string }[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { title: 'Categories', icon: Tag, path: '/categories' },
  { title: 'Products', icon: FileBox, path: '/products' },
  { title: 'Variants', icon: FileBox, path: '/variants' },
  { title: 'Materials', icon: Box, path: '/materials' },
  { title: 'Transactions', icon: CircleDollarSign, path: '/transactions' },
  { title: 'Expenses', icon: CreditCard, path: '/expenses' },
  { title: 'Wallets', icon: Wallet, path: '/wallets' },
  { title: 'Calculations', icon: Calculator, path: '/calculations' },
  { title: 'Budgets', icon: PiggyBank, path: '/budgets' },
];

export type SidebarProps = {
  onLogoutPress: () => void;
};

export const Sidebar = (props: SidebarProps) => {
  const { isShown, onToggleButtonPress } = useSidebarState();
  const onToggleFullScreenButtonPress = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };
  return (
    <>
      <YGroup
        width={240}
        $xs={{ position: 'absolute', top: 0, bottom: 0, zIndex: '$5' }}
        elevation="$1"
        backgroundColor="$gray3"
        borderRadius="$0"
        marginLeft={isShown ? 0 : -240}
      >
        <YStack flex={1} justifyContent="space-between">
          <YStack>
            <YStack padding="$5">
              <H3>Gatherloop POS</H3>
            </YStack>
            {items.map((item, index) => (
              <YGroup.Item key={index}>
                <Link href={item.path}>
                  <ListItem
                    backgroundColor="$colorTransparent"
                    hoverTheme
                    icon={item.icon}
                  >
                    {item.title}
                  </ListItem>
                </Link>
              </YGroup.Item>
            ))}

            {Platform.OS === 'web' && (
              <YStack padding="$5">
                <Button
                  onPress={onToggleFullScreenButtonPress}
                  icon={Fullscreen}
                  theme="blue"
                >
                  Toggle Full Screen
                </Button>
              </YStack>
            )}
          </YStack>

          <YStack padding="$5">
            <Button onPress={props.onLogoutPress} icon={LogOut}>
              Logout
            </Button>
          </YStack>
        </YStack>
      </YGroup>

      <Button
        icon={isShown ? ChevronsLeft : ChevronsRight}
        onPress={onToggleButtonPress}
        position="absolute"
        left={isShown ? 240 : 0}
        zIndex={999}
        animation="fast"
        size="$3"
        borderTopLeftRadius="$0"
        borderBottomLeftRadius="$0"
        bottom="$20"
        borderWidth="$0"
        theme="blue"
      ></Button>
    </>
  );
};
