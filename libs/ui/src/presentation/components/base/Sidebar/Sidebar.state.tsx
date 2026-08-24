import {
  Box,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  ShoppingCart,
} from '@tamagui/lucide-icons';
import { NamedExoticComponent, useEffect, useState } from 'react';
import { useRouter } from 'solito/router';
import {} from 'solito';
import { useMedia } from 'tamagui';
import { Platform } from 'react-native';

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
      { title: 'Rentals', path: '/rentals' },
      { title: 'Coupons', path: '/coupons' },
      { title: 'Tickets', path: '/tickets' },
      { title: 'Tables', path: '/tables' },
    ],
  },
  {
    title: 'Inventory',
    icon: Box,
    subItems: [
      { title: 'Categories', path: '/categories' },
      { title: 'Products', path: '/products' },
      { title: 'Materials', path: '/materials' },
      { title: 'Suppliers', path: '/suppliers' },
      { title: 'Stock Checks', path: '/stock-checks' },
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
  {
    title: 'Operations',
    icon: ClipboardList,
    subItems: [
      { title: 'Templates', path: '/checklist-templates' },
      { title: 'Sessions', path: '/checklist-sessions' },
    ],
  },
];

export const useSidebarState = () => {
  const media = useMedia();
  const isMobile = media.xs;

  const [isShown, setIsShown] = useState(!isMobile);

  const onToggleButtonPress = () => setIsShown((prev) => !prev);

  const router = useRouter();

  const [accordionValue, setAccordionValue] = useState<string>();
  const [currentPath, setCurrentPath] = useState<string>();

  useEffect(() => {
    // window.location isn't available on React Native — the highlighted
    // sub-item just falls back to none there. This has to stay an effect:
    // reading window during render would mismatch the server-rendered
    // markup (currentPath starts undefined on both server and first client
    // render, and only picks up the real path once mounted).
    if (Platform.OS === 'web') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPath(window.location.pathname);
    }
  }, []);

  // Sidebar overlays the screen on mobile, so it should start (and return
  // to) collapsed there, while staying open by default on larger screens.
  // Adjusted during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [prevIsMobile, setPrevIsMobile] = useState(isMobile);
  if (isMobile !== prevIsMobile) {
    setPrevIsMobile(isMobile);
    setIsShown(!isMobile);
  }

  // Same render-time adjustment, driven off `currentPath` once it is known.
  const [prevPath, setPrevPath] = useState(currentPath);
  if (currentPath !== prevPath) {
    setPrevPath(currentPath);

    const defaultItem = items.find(
      (item) =>
        item.path === currentPath ||
        item.subItems
          ?.map((subItem) => subItem.path)
          .includes(currentPath ?? '')
    );

    if (defaultItem) setAccordionValue(defaultItem.title);
  }

  return {
    isShown,
    onToggleButtonPress,
    router,
    items,
    accordionValue,
    setAccordionValue,
    currentPath,
    isMobile,
  };
};
