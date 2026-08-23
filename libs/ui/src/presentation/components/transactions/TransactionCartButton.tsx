import { formatRupiah } from '../../../utils/currency';
import { FloatingCartButton } from '../base';

export type TransactionCartButtonProps = {
  itemCount: number;
  total: number;
  onPress: () => void;
};

// Floating button shown above the compact product picker once the cart is
// non-empty (PRD "Compact — step 1", FR-3). Delegates its chrome to the
// shared `FloatingCartButton` (`base/`) and owns only its copy/total.
export const TransactionCartButton = ({
  itemCount,
  total,
  onPress,
}: TransactionCartButtonProps) => {
  return (
    <FloatingCartButton
      label={`${itemCount} ${
        itemCount === 1 ? 'item' : 'items'
      } · ${formatRupiah(total)} · View Cart`}
      onPress={onPress}
    />
  );
};
