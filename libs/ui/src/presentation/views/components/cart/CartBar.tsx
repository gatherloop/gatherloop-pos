import { Button, XStack } from 'tamagui';
import { formatRupiah } from '../../../../utils/currency';
import { ShoppingCart } from '@tamagui/lucide-icons';

export type CartBarProps = {
  itemCount: number;
  onPress: () => void;
};

export const CartBar = ({ itemCount, onPress }: CartBarProps) => {
  return (
    <XStack
      padding="$3"
      backgroundColor="$background"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      alignItems="center"
      justifyContent="center"
    >
      <Button icon={ShoppingCart} theme="blue" size="$5" onPress={onPress}>
        {`Lihat Keranjang · ${itemCount} item`}
      </Button>
    </XStack>
  );
};
