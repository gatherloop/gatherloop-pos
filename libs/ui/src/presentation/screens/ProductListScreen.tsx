import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { ProductDeleteAlert, ProductList, Layout } from '../components';
import {
  AuthLogoutUsecase,
  Product,
  ProductDeleteUsecase,
  ProductListUsecase,
} from '../../domain';
import {
  useAuthLogoutController,
  useProductDeleteController,
  useProductListController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

export type ProductListScreenProps = {
  productListUsecase: ProductListUsecase;
  productDeleteUsecase: ProductDeleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const ProductListScreen = (props: ProductListScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const productListController = useProductListController(
    props.productListUsecase
  );
  const productDeleteController = useProductDeleteController(
    props.productDeleteUsecase
  );

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
    <Layout
      {...authLogoutController}
      title="Products"
      rightActionItem={
        <Link href="/products/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ProductList
        {...productListController}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <ProductDeleteAlert {...productDeleteController} />
    </Layout>
  );
};
