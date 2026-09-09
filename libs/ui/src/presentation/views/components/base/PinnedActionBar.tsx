import { ReactNode } from 'react';
import { YStack } from 'tamagui';
import { Platform } from 'react-native';

export type PinnedActionBarProps = {
  children: ReactNode;
};

// Shared chrome for a pinned bottom action bar over scrolling content —
// background, top border, and env(safe-area-inset-bottom) on web / fixed
// padding on native. Generalises `FloatingCartButton`'s positioning
// (PRD docs/prd-stock-check-form-mobile.md FR-5) for callers that need more
// than a single label+onPress button, e.g. the stock-check compact Submit
// bar's disabled/Spinner states. Requires a `position: relative` ancestor.
export const PinnedActionBar = ({ children }: PinnedActionBarProps) => {
  return (
    <YStack
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      padding="$3"
      paddingBottom={
        Platform.OS === 'web' ? 'env(safe-area-inset-bottom, 13px)' : '$3'
      }
      backgroundColor="$background"
      borderTopWidth={1}
      borderTopColor="$borderColor"
    >
      {children}
    </YStack>
  );
};
