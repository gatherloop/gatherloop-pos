import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { ProductList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { ProductDeleteAlert } from '../../components/ProductDeleteAlert';

export const ProductListScreen = () => {
  return (
    <Layout
      title="Products"
      rightActionItem={
        <Link href="/products/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ProductList />
      <ProductDeleteAlert />
    </Layout>
  );
};
