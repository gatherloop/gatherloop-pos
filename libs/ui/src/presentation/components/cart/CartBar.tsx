import { Button, XStack } from 'tamagui';
import { formatRupiah } from '../../../utils/currency';

// UX Reference #3 in docs/prd-table-ordering.md: once the cart is non-empty,
// a persistent bar sits above the safe area on every screen. Mounted by
// `app/TableResolve.tsx` (FR-7 phase 10), since every menu/detail/cart route
// renders through `TableResolve`'s `resolved` branch.
export type CartBarProps = {
  itemCount: number;
  total: number;
  onPress: () => void;
};

export const CartBar = ({ itemCount, total, onPress }: CartBarProps) => {
  return (
    <XStack
      padding="$3"
      backgroundColor="$background"
      borderTopWidth={1}
      borderTopColor="$borderColor"
    >
      <Button theme="blue" size="$5" minHeight={44} flex={1} onPress={onPress}>
        {`${itemCount} item · ${formatRupiah(total)} · Lihat Keranjang`}
      </Button>
    </XStack>
  );
};
