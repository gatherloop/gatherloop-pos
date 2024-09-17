import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { ExpenseList, ExpenseDeleteAlert } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';

export const ExpenseListScreen = () => {
  return (
    <Layout
      title="Expenses"
      rightActionItem={
        <Link href="/expenses/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ExpenseList />
      <ExpenseDeleteAlert />
    </Layout>
  );
};
