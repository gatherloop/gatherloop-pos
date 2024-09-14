import { Button, H4, ScrollView, XStack, YStack } from 'tamagui';
import { Layout } from '../../../base';
import { WalletDetail, WalletTransferList } from '../../components';
import { useWalletTransferListScreenState } from './WalletTransferListScreen.state';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';

export type WalletTransferListScreenProps = {
  walletId: number;
};

export const WalletTransferListScreen = (
  props: WalletTransferListScreenProps
) => {
  const { walletId } = useWalletTransferListScreenState(props);
  return (
    <Layout title="Wallet Transfer" showBackButton>
      <YStack gap="$4" flex={1}>
        <WalletDetail walletId={walletId} />
        <YStack flex={1}>
          <XStack gap="$3" justifyContent="space-between">
            <H4>Transfer Histories</H4>
            <Link href={`/wallets/${walletId}/transfers/create`}>
              <Button size="$3" icon={Plus} variant="outlined" disabled />
            </Link>
          </XStack>
          <WalletTransferList walletId={walletId} />
        </YStack>
      </YStack>
    </Layout>
  );
};
