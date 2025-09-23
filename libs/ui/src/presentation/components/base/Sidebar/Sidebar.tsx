import {
  Box,
  Calculator,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  Clock,
  CreditCard,
  FileBox,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  Tag,
  Ticket,
  Wallet,
} from '@tamagui/lucide-icons';
import { Button, H5, ListItem, XStack, YGroup, YStack } from 'tamagui';
import { useSidebarState } from './Sidebar.state';
import { NamedExoticComponent } from 'react';
import { Link } from 'solito/link';

const items: { title: string; icon: NamedExoticComponent; path: string }[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { title: 'Categories', icon: Tag, path: '/categories' },
  { title: 'Products', icon: FileBox, path: '/products' },
  { title: 'Variants', icon: FileBox, path: '/variants' },
  { title: 'Materials', icon: Box, path: '/materials' },
  { title: 'Transactions', icon: CircleDollarSign, path: '/transactions' },
  { title: 'Reservations', icon: Clock, path: '/reservations' },
  { title: 'Coupons', icon: Ticket, path: '/coupons' },
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
          <YStack>
            <XStack padding="$3" paddingBottom="$0">
              <H5>Gatherloop POS</H5>
            </XStack>
            {items.map((item, index) => (
              <YGroup.Item key={index}>
                <Link href={item.path}>
                  <ListItem
                    backgroundColor="$colorTransparent"
                    hoverTheme
                    icon={item.icon}
                    size="$4"
                    cursor="pointer"
                  >
                    {item.title}
                  </ListItem>
                </Link>
              </YGroup.Item>
            ))}
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
