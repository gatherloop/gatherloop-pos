import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { CategoryList, CategoryDeleteAlert } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';

export const CategoryListScreen = () => {
  return (
    <Layout
      title="Categories"
      rightActionItem={
        <Link href="/categories/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <CategoryList />
      <CategoryDeleteAlert />
    </Layout>
  );
};
