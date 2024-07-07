import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { WalletDeleteAlert } from '../../components/WalletDeleteAlert';
import { useWalletListScreenState } from './WalletListScreen.state';

export const WalletListScreen = () => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    walletDeleteId,
  } = useWalletListScreenState();

  return (
    <Layout
      title="Wallets"
      rightActionItem={
        <Link href="/wallets/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ScrollView>
        <WalletList
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', onPress: onEditMenuPress },
            { title: 'Delete', onPress: onDeleteMenuPress },
          ]}
        />
      </ScrollView>
      {typeof walletDeleteId === 'number' && (
        <WalletDeleteAlert
          walletId={walletDeleteId}
          onSuccess={onDeleteSuccess}
          onCancel={onDeleteCancel}
        />
      )}
    </Layout>
  );
};
