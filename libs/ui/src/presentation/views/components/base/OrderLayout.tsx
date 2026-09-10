import { ReactNode } from 'react';
import { PortalProvider, ScrollView, YStack } from 'tamagui';

export type OrderLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
};

const orderShellHeightStyle = `
  .order-shell-height {
    height: 100vh;
    height: 100dvh;
  }
`;

export const OrderLayout = ({ children, header, footer }: OrderLayoutProps) => {
  return (
    <PortalProvider shouldAddRootHost>
      <style>{orderShellHeightStyle}</style>
      <YStack
        flex={1}
        className="order-shell-height"
        overflow="hidden"
        width="100%"
        maxWidth={480}
        marginHorizontal="auto"
        backgroundColor="$background"
      >
        {header}
        <ScrollView flex={1}>
          <YStack
            padding="$4"
            gap="$3"
            paddingBottom={footer ? '$8' : '$4'}
          >
            {children}
          </YStack>
        </ScrollView>
        {footer ? (
          <YStack
            paddingBottom="env(safe-area-inset-bottom, 13px)"
          >
            {footer}
          </YStack>
        ) : null}
      </YStack>
    </PortalProvider>
  );
};
