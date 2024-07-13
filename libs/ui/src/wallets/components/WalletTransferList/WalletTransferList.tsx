import { YStack } from 'tamagui';
import { useWalletTransferListState } from './WalletTransferList.state';
import { EmptyView, ErrorView, LoadingView, ListItem } from '../../../base';
import { Calendar, Clock } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';

export type WalletTransferListProps = {
  walletId: number;
};

export const WalletTransferList = ({ walletId }: WalletTransferListProps) => {
  const { walletTransfers, status, refetch } = useWalletTransferListState({
    walletId,
  });
  return (
    <YStack gap="$3" flexWrap="wrap">
      {status === 'pending' ? (
        <LoadingView title="Fetching Transfer Histories..." />
      ) : status === 'success' ? (
        walletTransfers.length > 0 ? (
          walletTransfers.map((walletTransfer) => (
            <ListItem
              key={walletTransfer.id}
              title={walletTransfer.toWallet.name ?? ''}
              subtitle={`Rp. ${walletTransfer.amount.toLocaleString('id')}`}
              footerItems={[
                {
                  value: dayjs(walletTransfer.createdAt).format('DD/MM/YYYY'),
                  icon: Calendar,
                },
                {
                  value: dayjs(walletTransfer.createdAt).format('HH:mm'),
                  icon: Clock,
                },
              ]}
            />
          ))
        ) : (
          <EmptyView
            title="Oops, Transfer History is Empty"
            subtitle="Please create a new transfer"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Transfer Histories"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={refetch}
        />
      )}
    </YStack>
  );
};
