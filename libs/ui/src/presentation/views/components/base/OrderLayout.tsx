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
        marginHorizontal="auto"
        backgroundColor="$background"
        justifyContent="space-between"
        flexDirection="column"
      >
        <YStack>{header}</YStack>
        <YStack
          padding="$4"
          flex={1}
          marginHorizontal="auto"
          $xxs={{ width: 320 }}
          $xs={{ width: 360 }}
          $gtXs={{ width: 480 }}
        >
          {children}
        </YStack>
        {footer ? <YStack>{footer}</YStack> : null}
      </YStack>
    </PortalProvider>
  );
};
