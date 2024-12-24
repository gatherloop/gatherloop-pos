import { Calendar, Clock, Pencil, Trash, Wallet } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import dayjs from 'dayjs';
import { XStackProps } from 'tamagui';

export type ExpenseListItemProps = {
  budgetName: string;
  total: number;
  createdAt: string;
  walletName: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const ExpenseListItem = ({
  budgetName,
  createdAt,
  total,
  walletName,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: ExpenseListItemProps) => {
  return (
    <ListItem
      title={budgetName}
      subtitle={`Rp. ${total.toLocaleString('id')}`}
      menus={[
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
      footerItems={[
        {
          icon: Calendar,
          value: dayjs(createdAt).format('DD/MM/YYYY'),
        },
        {
          icon: Clock,
          value: dayjs(createdAt).format('HH:mm'),
        },
        {
          icon: Wallet,
          value: walletName,
        },
      ]}
      {...xStackProps}
    />
  );
};
