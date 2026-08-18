import { ReactNode } from 'react';
import { PortalProvider, ScrollView, YStack } from 'tamagui';

// Mobile-first shell for the customer ordering app (D18 in
// docs/prd-table-ordering.md). Deliberately not `Layout` — this never
// renders a sidebar or navbar, and is capped at a phone-width column even
// on a wide viewport, since the QR flow is designed at 375px and never
// shown next to the POS chrome.
export type OrderLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
};

export const OrderLayout = ({ children, header, footer }: OrderLayoutProps) => {
  return (
    <PortalProvider shouldAddRootHost>
      <YStack
        flex={1}
        minHeight="100%"
        width="100%"
        maxWidth={480}
        marginHorizontal="auto"
        backgroundColor="$background"
      >
        {header}
        <ScrollView flex={1}>
          <YStack padding="$4" gap="$3">
            {children}
          </YStack>
        </ScrollView>
        {footer}
      </YStack>
    </PortalProvider>
  );
};
