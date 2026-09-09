import dayjs from 'dayjs';
import { ListItem } from '../base';
import { Calendar, Clock } from '@tamagui/lucide-icons';

export type WalletTransferListItemProps = {
  toWalletName: string;
  amount: number;
  createdAt: string;
};

export const WalletTransferListItem = ({
  toWalletName,
  amount,
  createdAt,
}: WalletTransferListItemProps) => {
  return (
    <ListItem
      title={toWalletName}
      subtitle={`Rp. ${amount.toLocaleString('id')}`}
      footerItems={[
        {
          value: dayjs(createdAt).format('DD/MM/YYYY'),
          icon: Calendar,
        },
        {
          value: dayjs(createdAt).format('HH:mm'),
          icon: Clock,
        },
      ]}
    />
  );
};
