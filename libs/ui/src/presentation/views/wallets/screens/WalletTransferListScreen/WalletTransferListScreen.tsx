import { Button, H4, XStack, YStack } from 'tamagui';
import { Layout } from '../../../base';
import { WalletDetail, WalletTransferList } from '../../widgets';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';

type ContentProps = {
  walletId: number;
};

const Content = ({ walletId }: ContentProps) => {
  return (
    <YStack gap="$4" flex={1}>
      <WalletDetail />
      <YStack flex={1} gap="$3">
        <XStack gap="$3" justifyContent="space-between">
          <H4>Transfer Histories</H4>
          <Link href={`/wallets/${walletId}/transfers/create`}>
            <Button size="$3" icon={Plus} variant="outlined" disabled />
          </Link>
        </XStack>
        <WalletTransferList />
      </YStack>
    </YStack>
  );
};

export type WalletTransferListScreenProps = {
  walletId: number;
};

export const WalletTransferListScreen = ({
  walletId,
}: WalletTransferListScreenProps) => {
  return (
    <Layout title="Wallet Transfer" showBackButton>
      <Content walletId={walletId} />
    </Layout>
  );
};
