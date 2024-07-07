import { Button, H3, Paragraph, ScrollView, XStack, YStack } from 'tamagui';
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
    <Layout>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack>
          <H3>Wallets</H3>
          <Paragraph>Manage your wallet</Paragraph>
        </YStack>
        <Link href="/wallets/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      </XStack>
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
