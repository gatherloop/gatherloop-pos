import { Button, YStack } from 'tamagui';
import { Platform } from 'react-native';
import { formatRupiah } from '../../../utils/currency';

export type TransactionCartButtonProps = {
  itemCount: number;
  total: number;
  onPress: () => void;
};

// Floating button shown above the compact product picker once the cart is
// non-empty (PRD "Compact — step 1", FR-3). Mirrors `cart/CartBar.tsx`'s
// docked-bar styling; `env(safe-area-inset-bottom)` is web-only (same trick
// already used in `OrderLayout`'s footer) so native falls back to a fixed
// padding instead.
export const TransactionCartButton = ({
  itemCount,
  total,
  onPress,
}: TransactionCartButtonProps) => {
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
      <Button theme="blue" size="$5" minHeight={44} onPress={onPress}>
        {`${itemCount} ${itemCount === 1 ? 'item' : 'items'} · ${formatRupiah(
          total
        )} · View Cart`}
      </Button>
    </YStack>
  );
};
