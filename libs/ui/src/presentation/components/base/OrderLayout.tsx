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

// A definite viewport height (rather than `minHeight: 100%`, which resolved
// against a body with no defined height and let the shell grow to fit its
// content) is what makes the `ScrollView` below the scrolling element, so
// `footer` is genuinely pinned to the bottom of the viewport instead of the
// bottom of the document (FR-1). This is a real stylesheet rule, not an
// inline style, because it needs two `height` declarations back to back —
// `100vh` then `100dvh` — so a browser without `dvh` support keeps the `vh`
// value instead of dropping the rule; an inline style (all a Tamagui
// `height` prop can produce) can only hold one value per property. Declared
// here rather than in `apps/order/src/styles.css` so the shell is
// self-contained and behaves the same in Storybook.
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
            // Bottom padding so the last child is never trapped under a
            // floating footer (cart bar / checkout bar). Matches the
            // footer's own padding + safe-area inset closely enough that a
            // few extra px of breathing room here is harmless when there is
            // no footer.
            paddingBottom={footer ? '$8' : '$4'}
          >
            {children}
          </YStack>
        </ScrollView>
        {footer ? (
          <YStack
            // `env(safe-area-inset-bottom)` clears the iOS home indicator
            // once the footer is genuinely pinned to the viewport edge
            // (FR-1) rather than sitting at the bottom of a page that could
            // already scroll past it. `13px` (the `$3` token's resolved
            // value) is the fallback for browsers without `env()` support.
            paddingBottom="env(safe-area-inset-bottom, 13px)"
          >
            {footer}
          </YStack>
        ) : null}
      </YStack>
    </PortalProvider>
  );
};
