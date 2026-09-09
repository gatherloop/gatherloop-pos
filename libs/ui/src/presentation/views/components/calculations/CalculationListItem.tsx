import { Calendar, CheckCircle, Pencil, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import dayjs from 'dayjs';
import { XStackProps } from 'tamagui';
import { getCalculationStatus } from './utils';

export type CalculationListItemProps = {
  walletName: string;
  totalWallet: number;
  totalCalculation: number;
  createdAt: string;
  completedAt: string | null;
  onEditMenuPress?: () => void;
  onDeleteMenuPress?: () => void;
  onCompleteMenuPress?: () => void;
} & XStackProps;

export const CalculationListItem = ({
  createdAt,
  completedAt,
  walletName,
  totalWallet,
  totalCalculation,
  onEditMenuPress,
  onDeleteMenuPress,
  onCompleteMenuPress,
  ...xStackProps
}: CalculationListItemProps) => {
  return (
    <ListItem
      title={walletName}
      subtitle={getCalculationStatus({ totalCalculation, totalWallet })}
      backgroundColor="$background"
      theme={completedAt ? 'gray' : 'red'}
      menus={[
        {
          title: 'Complete',
          icon: CheckCircle,
          onPress: onCompleteMenuPress,
          isShown: typeof onCompleteMenuPress === 'function' && !completedAt,
        },
        {
          title: 'Edit',
          icon: Pencil,
          onPress: onEditMenuPress,
          isShown: typeof onEditMenuPress === 'function' && !completedAt,
        },
        {
          title: 'Delete',
          icon: Trash,
          onPress: onDeleteMenuPress,
          isShown: typeof onDeleteMenuPress === 'function' && !completedAt,
        },
      ]}
      footerItems={[
        {
          icon: Calendar,
          label: 'CALCULATION DATE',
          value: dayjs(createdAt).format('DD/MM/YYYY - HH:mm'),
        },
        {
          icon: Calendar,
          label: 'COMPLETION DATE',
          value: dayjs(completedAt).format('DD/MM/YYYY - HH:mm'),
          isShown: typeof completedAt === 'string',
        },
      ]}
      {...xStackProps}
    />
  );
};
