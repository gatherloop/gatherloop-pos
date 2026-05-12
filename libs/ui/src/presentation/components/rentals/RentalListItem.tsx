import { Calendar, QrCode, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import dayjs from 'dayjs';
import { XStackProps } from 'tamagui';

export type RentalListItemProps = {
  code: string;
  name: string;
  variantName: string;
  checkinAt: string;
  checkoutAt?: string;
  runningTotal?: number;
  onDeleteMenuPress?: () => void;
  onItemPress?: () => void;
} & XStackProps;

export const RentalListItem = ({
  code,
  name,
  variantName,
  checkinAt,
  checkoutAt,
  runningTotal,
  onDeleteMenuPress,
  onItemPress,
  ...xStackProps
}: RentalListItemProps) => {
  const target = dayjs(checkinAt).add(15, 'minute');
  const canDelete = dayjs().isBefore(target);
  const durationMinutes = Math.ceil(
    (Date.now() - new Date(checkinAt).getTime()) / 60000
  );
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationLabel =
    hours > 0 && minutes > 0
      ? `${hours}h ${minutes}m`
      : hours > 0
      ? `${hours}h`
      : `${minutes}m`;

  return (
    <ListItem
      title={name}
      subtitle={variantName}
      backgroundColor="$background"
      theme={checkoutAt ? 'gray' : 'red'}
      onPress={onItemPress}
      menus={
        canDelete && onDeleteMenuPress
          ? [
              {
                title: 'Delete',
                icon: Trash,
                onPress: onDeleteMenuPress,
              },
            ]
          : undefined
      }
      footerItems={[
        {
          icon: QrCode,
          label: 'CODE',
          value: code,
        },
        {
          icon: Calendar,
          label: 'CHECKIN DATE',
          value: dayjs(checkinAt).format('DD/MM/YYYY - HH:mm'),
        },
        {
          icon: Calendar,
          label: 'CHECKOUT DATE',
          value: dayjs(checkoutAt).format('DD/MM/YYYY - HH:mm'),
          isShown: typeof checkoutAt === 'string',
        },
        {
          icon: Calendar,
          label: 'DURATION',
          value: durationLabel,
          isShown: !checkoutAt,
        },
        {
          icon: Calendar,
          label: 'RUNNING TOTAL',
          value: `Rp. ${(runningTotal ?? 0).toLocaleString('id')}`,
          isShown: !checkoutAt && runningTotal !== undefined,
        },
      ]}
      {...xStackProps}
    />
  );
};
