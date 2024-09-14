import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { WalletList } from '../../components';
import { Link } from 'solito/link';
import { CreditCard, Pencil, Plus, Trash } from '@tamagui/lucide-icons';
import { WalletDeleteAlert } from '../../components/WalletDeleteAlert';
import { useWalletListScreenState } from './WalletListScreen.state';

export const WalletListScreen = () => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    onTransferMenuPress,
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
      <WalletList
        onItemPress={onItemPress}
        itemMenus={[
          {
            title: 'Transfer',
            icon: CreditCard,
            onPress: onTransferMenuPress,
          },
          { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
          { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
        ]}
      />
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
