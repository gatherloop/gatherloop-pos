import { ReactNode } from 'react';
import { PortalProvider, ScrollView, YStack } from 'tamagui';

export type OrderLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
};

const orderShellHeightStyle = `
  .order-shell-height {
    max-height: 100vh;
    max-height: 100dvh;
  }
`;

export const OrderLayout = ({ children, header, footer }: OrderLayoutProps) => {
  return (
    <PortalProvider shouldAddRootHost>
      <style>{orderShellHeightStyle}</style>
      <YStack
        flex={1}
        className="order-shell-height"
        width="100%"
        maxWidth={480}
        marginHorizontal="auto"
        backgroundColor="$background"
        justifyContent="space-between"
        flexDirection="column"
      >
        {header}
        <YStack padding="$4" flex={1}>
          {children}
        </YStack>
        {footer ? <YStack>{footer}</YStack> : null}
      </YStack>
    </PortalProvider>
  );
};
