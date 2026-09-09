import { PortalProvider, XStack, YStack } from 'tamagui';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar/Navbar';
import { ReactNode } from 'react';

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
  return (
    <PortalProvider shouldAddRootHost>
      <XStack flex={1}>
        <Sidebar onLogoutPress={onLogoutPress} />
        <YStack flex={1}>
          <Navbar
            title={title}
            showBackButton={showBackButton}
            rightActionItem={rightActionItem}
          />
          {/* PRD docs/prd-stock-check-form-mobile.md FR-7: 40dp of padding
              on a 360dp viewport is 11% of the screen. Every screen rendered
              through `Layout` gets the same `$3` well on compact; ≥801px is
              unchanged. */}
          <YStack padding="$5" $sm={{ padding: '$3' }} gap="$3" flex={1}>
            {children}
          </YStack>
        </YStack>
      </XStack>
    </PortalProvider>
  );
};
