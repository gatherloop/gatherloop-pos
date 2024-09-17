import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { WalletList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';

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
      <WalletList />
    </Layout>
  );
};
