import { Calendar, Clock, Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import dayjs from 'dayjs';
import { XStackProps } from 'tamagui';

export type CalculationListItemProps = {
  walletName: string;
  totalWallet: number;
  totalCalculation: number;
  createdAt: string;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
} & XStackProps;

export const CalculationListItem = ({
  createdAt,
  walletName,
  totalWallet,
  totalCalculation,
  onEditMenuPress,
  onDeleteMenuPress,
  ...xStackProps
}: CalculationListItemProps) => {
  const status = totalCalculation === totalWallet ? 'Balanced' : 'Unbalanced';
  return (
    <ListItem
      title={walletName}
      subtitle={status}
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
      ]}
      {...xStackProps}
    />
  );
};
