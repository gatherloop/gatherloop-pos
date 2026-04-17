import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { WalletList, Layout } from '../components';
import { Wallet } from '../../domain';

export type WalletListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (wallet: Wallet) => void;
  onItemPress: (wallet: Wallet) => void;
  onTransferMenuPress: (wallet: Wallet) => void;
  onRetryButtonPress: () => void;
  variant: { type: 'loading' } | { type: 'error' } | { type: 'empty' } | { type: 'loaded'; items: Wallet[] };
  isRevalidating?: boolean;
};

export const WalletListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onItemPress,
  onTransferMenuPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
}: WalletListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Wallets"
      rightActionItem={
        <Link href="/wallets/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <WalletList
        variant={variant}
        onRetryButtonPress={onRetryButtonPress}
        onEditMenuPress={onEditMenuPress}
        onItemPress={onItemPress}
        onTransferMenuPress={onTransferMenuPress}
        isRevalidating={isRevalidating}
      />
    </Layout>
  );
};
