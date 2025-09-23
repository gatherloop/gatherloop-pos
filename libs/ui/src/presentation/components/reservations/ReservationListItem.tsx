import { Calendar, QrCode, Trash } from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import dayjs from 'dayjs';
import { XStackProps } from 'tamagui';

export type ReservationListItemProps = {
  code: string;
  name: string;
  variantName: string;
  checkinAt: string;
  checkoutAt?: string;
  onDeleteMenuPress?: () => void;
  onItemPress?: () => void;
} & XStackProps;

export const ReservationListItem = ({
  code,
  name,
  variantName,
  checkinAt,
  checkoutAt,
  onDeleteMenuPress,
  onItemPress,
  ...xStackProps
}: ReservationListItemProps) => {
  const target = dayjs(checkinAt).add(15, 'minute');
  const canDelete = dayjs().isBefore(target);
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
      ]}
      {...xStackProps}
    />
  );
};
