import { Button, H4, XStack, YStack } from 'tamagui';
import { WalletListItem, WalletTransferList, Layout } from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  useAuthLogoutController,
  useWalletDetailController,
  useWalletTransferListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  WalletDetailUsecase,
  WalletTransferListUsecase,
} from '../../domain';

export type WalletTransferListScreenProps = {
  walletId: number;
  walletTransferListUsecase: WalletTransferListUsecase;
  walletDetailUsecase: WalletDetailUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletTransferListScreen = ({
  walletId,
  walletTransferListUsecase,
  walletDetailUsecase,
  authLogoutUsecase,
}: WalletTransferListScreenProps) => {
  const authLogoutController = useAuthLogoutController(authLogoutUsecase);

  const walletTransferListController = useWalletTransferListController(
    walletTransferListUsecase
  );
  const walletDetailController = useWalletDetailController(walletDetailUsecase);

  return (
    <Layout {...authLogoutController} title="Wallet Transfer" showBackButton>
      <YStack gap="$4" flex={1}>
        <WalletListItem {...walletDetailController} />
        <YStack flex={1} gap="$3">
          <XStack gap="$3" justifyContent="space-between">
            <H4>Transfer Histories</H4>
            <Link href={`/wallets/${walletId}/transfers/create`}>
              <Button size="$3" icon={Plus} variant="outlined" disabled />
            </Link>
          </XStack>
          <WalletTransferList {...walletTransferListController} />
        </YStack>
      </YStack>
    </Layout>
  );
};
