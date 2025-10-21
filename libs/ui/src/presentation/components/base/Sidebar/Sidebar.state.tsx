import {
  Box,
  DollarSign,
  LayoutDashboard,
  ShoppingCart,
} from '@tamagui/lucide-icons';
import { NamedExoticComponent, useEffect, useState } from 'react';
import { useRouter } from 'solito/router';
import {} from 'solito';

type MenuItem = {
  title: string;
  icon: NamedExoticComponent<{ size: string }>;
  path?: string;
  subItems?: {
    title: string;
    path: string;
  }[];
};

const items: MenuItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    title: 'Sales',
    icon: ShoppingCart,
    subItems: [
      { title: 'Transactions', path: '/transactions' },
      { title: 'Reservations', path: '/reservations' },
      { title: 'Coupons', path: '/coupons' },
    ],
  },
  {
    title: 'Inventory',
    icon: Box,
    subItems: [
      { title: 'Categories', path: '/categories' },
      { title: 'Products', path: '/products' },
      { title: 'Variants', path: '/variants' },
      { title: 'Materials', path: '/materials' },
    ],
  },
  {
    title: 'Finance',
    icon: DollarSign,
    subItems: [
      { title: 'Expenses', path: '/expenses' },
      { title: 'Wallets', path: '/wallets' },
      { title: 'Calculations', path: '/calculations' },
      { title: 'Budgets', path: '/budgets' },
    ],
  },
];

export const useSidebarState = () => {
  const [isShown, setIsShown] = useState(true);

  const onToggleButtonPress = () => setIsShown((prev) => !prev);

  const router = useRouter();

  const [accordionValue, setAccordionValue] = useState<string>();
  const [currentPath, setCurrentPath] = useState<string>();

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  useEffect(() => {
    const defaultItem = items.find(
      (item) =>
        item.path === currentPath ||
        item.subItems
          ?.map((subItem) => subItem.path)
          .includes(currentPath ?? '')
    );

    if (defaultItem) setAccordionValue(defaultItem.title);
  }, [currentPath]);

  return {
    isShown,
    onToggleButtonPress,
    router,
    items,
    accordionValue,
    setAccordionValue,
    currentPath,
  };
};
