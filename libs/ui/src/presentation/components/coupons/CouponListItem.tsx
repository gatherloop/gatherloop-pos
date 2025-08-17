import { Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import { XStackProps } from 'tamagui';

export type CouponListItemProps = {
  code: string;
  amount: number;
  type: 'fixed' | 'percentage';
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const CouponListItem = ({
  code,
  amount,
  type,
  onDeleteMenuPress,
  onEditMenuPress,
  ...xStackProps
}: CouponListItemProps) => {
  const discountValue =
    type === 'fixed' ? `Rp. ${amount.toLocaleString('id')}` : `${amount}%`;
  return (
    <ListItem
      title={code}
      subtitle={`Discount ${discountValue}`}
      menus={[
        { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
        { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
      ]}
      {...xStackProps}
    />
  );
};
