import {
  Box,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  Tag,
  User,
  Wallet,
} from '@tamagui/lucide-icons';
import { Button, H3, ListItem, YGroup, YStack } from 'tamagui';
import { useSidebarState } from './state';
import { NamedExoticComponent } from 'react';

const items: { title: string; icon: NamedExoticComponent }[] = [
  { title: 'Dashboard', icon: LayoutDashboard },
  { title: 'Products', icon: Box },
  { title: 'Categories', icon: Tag },
  { title: 'Transactions', icon: DollarSign },
  { title: 'Expenses', icon: CreditCard },
  { title: 'Wallets', icon: Wallet },
  { title: 'Users', icon: User },
];

export const Sidebar = () => {
  const { isShown, toggleShown } = useSidebarState();
  return (
    <>
      <YGroup
        width={240}
        $xs={{ position: 'absolute', top: 0, bottom: 0, zIndex: '$5' }}
        backgroundColor="$gray3"
        borderRadius="$0"
        animation="quick"
        style={{ marginLeft: isShown ? 0 : -240 }}
      >
        <YStack padding="$5">
          <H3>Gatherloop POS</H3>
        </YStack>
        {items.map((item, index) => (
          <YGroup.Item key={index}>
            <ListItem
              backgroundColor="$colorTransparent"
              hoverTheme
              icon={item.icon}
            >
              {item.title}
            </ListItem>
          </YGroup.Item>
        ))}
      </YGroup>

      <Button
        icon={isShown ? ChevronsLeft : ChevronsRight}
        onPress={toggleShown}
        position="absolute"
        left={isShown ? 240 : 0}
        zIndex={999}
        animation="quick"
        size="$3"
        borderTopLeftRadius="$0"
        borderBottomLeftRadius="$0"
        top="$3"
        borderWidth="$0"
      ></Button>
    </>
  );
};
