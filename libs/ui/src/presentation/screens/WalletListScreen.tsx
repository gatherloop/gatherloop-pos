import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { WalletList, Layout } from '../components';
import { AuthLogoutUsecase, Wallet, WalletListUsecase } from '../../domain';
import { useRouter } from 'solito/router';
import {
  useAuthLogoutController,
  useWalletListController,
} from '../controllers';

export type WalletListScreenProps = {
  walletListUsecase: WalletListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletListScreen = (props: WalletListScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const controller = useWalletListController(props.walletListUsecase);

  const router = useRouter();

  const onEditMenuPress = (material: Wallet) => {
    router.push(`/wallets/${material.id}`);
  };

  const onItemPress = (material: Wallet) => {
    router.push(`/wallets/${material.id}/transfers`);
  };

  const onTransferMenuPress = (material: Wallet) => {
    router.push(`/wallets/${material.id}/transfers`);
  };

  return (
    <Layout
      {...authLogoutController}
      title="Wallets"
      rightActionItem={
        <Link href="/wallets/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <WalletList
        {...controller}
        onEditMenuPress={onEditMenuPress}
        onItemPress={onItemPress}
        onTransferMenuPress={onTransferMenuPress}
      />
    </Layout>
  );
};
