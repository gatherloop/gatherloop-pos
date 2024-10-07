import { CreditCard, MinusSquare, Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../../../base';
import { XStackProps } from 'tamagui';

export type WalletListItemProps = {
  name: string;
  balance: number;
  paymentCostPercentage: number;
  onTransferMenuPress?: () => void;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const WalletListItem = ({
  name,
  balance,
  paymentCostPercentage,
  onTransferMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: WalletListItemProps) => {
  return (
    <ListItem
      title={name}
      subtitle={`Rp. ${balance.toLocaleString('id')}`}
      thumbnailSrc="https://placehold.jp/120x120.png"
      menus={[
        {
          title: 'Transfer',
          icon: CreditCard,
          onPress: onTransferMenuPress,
          isShown: typeof onTransferMenuPress === 'function',
        },
        {
          title: 'Edit',
          icon: Pencil,
          onPress: onEditMenuPress,
          isShown: typeof onEditMenuPress === 'function',
        },
        {
          title: 'Delete',
          icon: Trash,
          onPress: onDeleteMenuPress,
          isShown: typeof onDeleteMenuPress === 'function',
        },
      ]}
      footerItems={[{ value: `${paymentCostPercentage}%`, icon: MinusSquare }]}
      {...xStackProps}
    />
  );
};
