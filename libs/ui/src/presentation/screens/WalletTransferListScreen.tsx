import { Button, H4, XStack, YStack } from 'tamagui';
import {
  WalletListItem,
  WalletTransferList,
  Layout,
  WalletTransferListProps,
} from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';

export type WalletTransferListScreenProps = {
  walletId: number;
  onLogoutPress: () => void;
  name: string;
  balance: number;
  paymentCostPercentage: number;
  variant: WalletTransferListProps['variant'];
  onRetryButtonPress: () => void;
  isRevalidating?: boolean;
};

export const WalletTransferListScreen = ({
  walletId,
  onLogoutPress,
  name,
  balance,
  paymentCostPercentage,
  variant,
  onRetryButtonPress,
  isRevalidating,
}: WalletTransferListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Wallet Transfer"
      showBackButton
    >
      <YStack gap="$4" flex={1}>
        <WalletListItem
          name={name}
          balance={balance}
          paymentCostPercentage={paymentCostPercentage}
        />
        <YStack flex={1} gap="$3">
          <XStack gap="$3" justifyContent="space-between">
            <H4>Transfer Histories</H4>
            <Link href={`/wallets/${walletId}/transfers/create`}>
              <Button size="$3" icon={Plus} variant="outlined" disabled />
            </Link>
          </XStack>
          <WalletTransferList
            variant={variant}
            onRetryButtonPress={onRetryButtonPress}
            isRevalidating={isRevalidating}
          />
        </YStack>
      </YStack>
    </Layout>
  );
};
