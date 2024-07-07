import {
  Box,
  ChevronsLeft,
  ChevronsRight,
  FileBox,
  Tag,
  Wallet,
} from '@tamagui/lucide-icons';
import { Button, H3, ListItem, YGroup, YStack } from 'tamagui';
import { useSidebarState } from './Sidebar.state';
import { NamedExoticComponent } from 'react';

const items: { title: string; icon: NamedExoticComponent; path: string }[] = [
  { title: 'Categories', icon: Tag, path: '/categories' },
  { title: 'Products', icon: FileBox, path: '/products' },
  { title: 'Materials', icon: Box, path: '/materials' },
  { title: 'Wallets', icon: Wallet, path: '/wallets' },
  { title: 'Budgets', icon: Wallet, path: '/budgets' },
];

export const Sidebar = () => {
  const { isShown, onToggleButtonPress, onMenuItemPress } = useSidebarState();
  return (
    <>
      <YGroup
        width={240}
        $xs={{ position: 'absolute', top: 0, bottom: 0, zIndex: '$5' }}
        backgroundColor="$gray3"
        borderRadius="$0"
        animation="quick"
        marginLeft={isShown ? 0 : -240}
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
              onPress={() => onMenuItemPress(item.path)}
            >
              {item.title}
            </ListItem>
          </YGroup.Item>
        ))}
      </YGroup>

      <Button
        icon={isShown ? ChevronsLeft : ChevronsRight}
        onPress={onToggleButtonPress}
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
