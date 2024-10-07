import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { WalletList } from '../../widgets';
import { Wallet } from '../../../../../domain';
import { useRouter } from 'solito/router';

const Content = () => {
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
    <WalletList
      onEditMenuPress={onEditMenuPress}
      onItemPress={onItemPress}
      onTransferMenuPress={onTransferMenuPress}
    />
  );
};

export const WalletListScreen = () => {
  return (
    <Layout
      title="Wallets"
      rightActionItem={
        <Link href="/wallets/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <Content />
    </Layout>
  );
};
