import { formatRupiah } from '../../../../utils/currency';
import { FloatingCartButton } from '../base';

export type TransactionCartButtonProps = {
  itemCount: number;
  total: number;
  onPress: () => void;
};

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
