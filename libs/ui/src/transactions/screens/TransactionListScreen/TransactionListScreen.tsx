import { Button } from 'tamagui';
import { Layout } from '../../../base';
import {
  TransactionList,
  TransactionDeleteAlert,
  TransactionPaymentAlert,
} from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';

export const TransactionListScreen = () => {
  return (
    <Layout
      title="Transactions"
      rightActionItem={
        <Link href="/transactions/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <TransactionList />
      <TransactionDeleteAlert />
      <TransactionPaymentAlert />
    </Layout>
  );
};
