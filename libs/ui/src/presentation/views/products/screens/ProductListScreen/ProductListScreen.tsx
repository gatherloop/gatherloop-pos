import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { ProductDeleteAlert, ProductList } from '../../widgets';
import { Product } from '../../../../../domain';
import {
  useProductDeleteController,
  useProductListController,
} from '../../../../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

const Content = () => {
  const productListController = useProductListController();
  const productDeleteController = useProductDeleteController();

  const router = useRouter();

  useEffect(() => {
    if (productDeleteController.state.type === 'deletingSuccess')
      productListController.dispatch({ type: 'FETCH' });
  }, [productDeleteController.state.type, productListController]);

  const onEditMenuPress = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  const onItemPress = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  const onDeleteMenuPress = (product: Product) => {
    productDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      productId: product.id,
    });
  };
  return (
    <>
      <ProductList
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <ProductDeleteAlert />
    </>
  );
};

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
      <Content />
    </Layout>
  );
};
