import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { ProductList } from '../../components';
import { Link } from 'solito/link';
import { Box, Pencil, Plus, Trash } from '@tamagui/lucide-icons';
import { ProductDeleteAlert } from '../../components/ProductDeleteAlert';
import { useProductListScreenState } from './ProductListScreen.state';

export const ProductListScreen = () => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    productDeleteId,
  } = useProductListScreenState();

  return (
    <Layout
      title="Products"
      rightActionItem={
        <Link href="/products/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ScrollView>
        <ProductList
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
            { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
          ]}
        />
      </ScrollView>
      {typeof productDeleteId === 'number' && (
        <ProductDeleteAlert
          productId={productDeleteId}
          onSuccess={onDeleteSuccess}
          onCancel={onDeleteCancel}
        />
      )}
    </Layout>
  );
};
