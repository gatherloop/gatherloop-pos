import { Button, XStack } from 'tamagui';
import { formatRupiah } from '../../../../utils/currency';

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
