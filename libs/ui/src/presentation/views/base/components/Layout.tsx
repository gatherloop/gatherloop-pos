import { PortalProvider, XStack, YStack } from 'tamagui';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar/Navbar';
import { ReactNode } from 'react';

export type LayoutProps = {
  children: React.ReactNode;
  title: string;
  showBackButton?: boolean;
  rightActionItem?: ReactNode;
};

export const Layout = ({
  children,
  title,
  showBackButton,
  rightActionItem,
}: LayoutProps) => {
  return (
    <PortalProvider shouldAddRootHost>
      <XStack flex={1}>
        <Sidebar />
        <YStack flex={1}>
          <Navbar
            title={title}
            showBackButton={showBackButton}
            rightActionItem={rightActionItem}
          />
          <YStack padding="$5" gap="$3" flex={1}>
            {children}
          </YStack>
        </YStack>
      </XStack>
    </PortalProvider>
  );
};
