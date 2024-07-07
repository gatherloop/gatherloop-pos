import { Button, ScrollView, XStack } from 'tamagui';
import { Layout } from '../../../base';
import { ProductList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
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
    <Layout title="Products">
      <XStack justifyContent="flex-end">
        <Link href="/products/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled>
            Create
          </Button>
        </Link>
      </XStack>
      <ScrollView>
        <ProductList
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', onPress: onEditMenuPress },
            { title: 'Delete', onPress: onDeleteMenuPress },
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
