import { Menu } from '@tamagui/lucide-icons';
import { Button, PortalProvider, XStack, YStack, useMedia } from 'tamagui';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar/Navbar';
import { ContentContainer } from './ContentContainer';
import { ReactNode, useEffect, useState } from 'react';

export type LayoutProps = {
  children: React.ReactNode;
  title: string;
  showBackButton?: boolean;
  rightActionItem?: ReactNode;
  onLogoutPress: () => void;
};

export const Layout = ({
  children,
  title,
  showBackButton,
  rightActionItem,
  onLogoutPress,
}: LayoutProps) => {
  const media = useMedia();
  const [isSidebarShown, setIsSidebarShown] = useState(false);

  // Default: open on desktop, closed on mobile/tablet
  useEffect(() => {
    setIsSidebarShown(!!media.gtMd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally runs once on mount with initial media value

  const onToggleSidebar = () => setIsSidebarShown((prev) => !prev);

  const hamburgerButton = (
    <Button
      icon={Menu}
      size="$3"
      variant="outlined"
      circular
      onPress={onToggleSidebar}
      aria-label="Toggle navigation menu"
      data-testid="sidebar-toggle"
    />
  );

  return (
    <PortalProvider shouldAddRootHost>
      <XStack flex={1}>
        <Sidebar
          onLogoutPress={onLogoutPress}
          isShown={isSidebarShown}
          onToggle={onToggleSidebar}
          onOpenChange={setIsSidebarShown}
        />
        <YStack flex={1}>
          <Navbar
            title={title}
            showBackButton={showBackButton}
            rightActionItem={rightActionItem}
            leftActionItem={!media.gtMd ? hamburgerButton : undefined}
          />
          <YStack
            flex={1}
            padding="$5"
            $xs={{ padding: '$3' }}
            $sm={{ padding: '$4' }}
            gap="$3"
          >
            <ContentContainer>{children}</ContentContainer>
          </YStack>
        </YStack>
      </XStack>
    </PortalProvider>
  );
};
