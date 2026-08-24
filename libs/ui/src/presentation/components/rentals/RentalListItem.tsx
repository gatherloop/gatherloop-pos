import {
  Calendar,
  Clock,
  DollarSign,
  QrCode,
  Trash,
} from '@tamagui/lucide-icons';
import { ListItem } from '../base';
import dayjs from 'dayjs';
import { Paragraph, XStack, XStackProps, YStack } from 'tamagui';

export type RentalListItemProps = {
  code: string;
  ticketName?: string | null;
  name: string;
  variantName: string;
  checkinAt: string;
  checkoutAt?: string;
  total?: number;
  isInCart?: boolean;
  onDeleteMenuPress?: () => void;
  onItemPress?: () => void;
} & XStackProps;

const InCartBadge = () => (
  <XStack
    backgroundColor="$green5"
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
    alignSelf="flex-start"
  >
    <Paragraph size="$1" color="$green11">
      In Cart
    </Paragraph>
  </XStack>
);

export const RentalListItem = ({
  code,
  ticketName,
  name,
  variantName,
  checkinAt,
  checkoutAt,
  total,
  isInCart,
  onDeleteMenuPress,
  onItemPress,
  ...xStackProps
}: RentalListItemProps) => {
  const end = checkoutAt ? dayjs(checkoutAt) : dayjs();
  const totalMinutes = end.diff(dayjs(checkinAt), 'minute');
  const durationLabel = `${Math.floor(totalMinutes / 60)}h ${
    totalMinutes % 60
  }m`;
  const canDelete = totalMinutes < 15 && !checkoutAt;

  return (
    <ListItem
      title={name}
      subtitle={
        isInCart ? (
          <YStack gap="$1">
            <Paragraph textTransform="none" ellipse size="$6">
              {variantName}
            </Paragraph>
            <InCartBadge />
          </YStack>
        ) : (
          variantName
        )
      }
      backgroundColor="$background"
      opacity={isInCart ? 0.6 : 1}
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
          label: 'TICKET',
          value: ticketName ?? code,
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
          icon: Clock,
          label: 'DURATION',
          value: durationLabel,
        },
        {
          icon: DollarSign,
          label: 'TOTAL',
          value: `Rp. ${(total ?? 0).toLocaleString('id')}`,
          isShown: total !== undefined,
        },
      ]}
      {...xStackProps}
    />
  );
};
