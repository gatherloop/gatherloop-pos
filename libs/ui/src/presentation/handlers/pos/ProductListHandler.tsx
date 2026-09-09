import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Product,
  ProductDeleteUsecase,
  ProductListUsecase,
  SaleType,
  StatusFilter,
} from '../../../domain';
import { ProductListScreen, ProductListScreenProps } from '../../screens/pos/ProductListScreen';
import { match, P } from 'ts-pattern';
import { useCallback, useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useFocusEffect } from '../../../utils';
import { useUsecase, useAuthLogout } from '../hooks';

export type ProductListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  productListUsecase: ProductListUsecase;
  productDeleteUsecase: ProductDeleteUsecase;
};

export const ProductListHandler = ({
  authLogoutUsecase,
  productListUsecase,
  productDeleteUsecase,
}: ProductListHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const productList = useUsecase(productListUsecase);
  const productDelete = useUsecase(productDeleteUsecase);
  const router = useRouter();
  const toast = useToastController();

  useFocusEffect(
    useCallback(() => {
      productList.dispatch({ type: 'FETCH' });
    }, [productList.dispatch])
  );

  useEffect(() => {
    match(productDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        toast.show('Delete Product Success');
        productList.dispatch({ type: 'FETCH' });
      })
      .with({ type: 'deletingError' }, () => {
        toast.show('Delete Product Error');
      })
      .otherwise(() => {
        // NOTHING TODO
      });
  }, [productDelete.state, productList, toast]);

  return (
    <ProductListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(product: Product) =>
        router.push(`/products/${product.id}`)
      }
      onItemPress={(product: Product) =>
        router.push(`/products/${product.id}`)
      }
      onDeleteMenuPress={(product: Product) =>
        productDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          productId: product.id,
        })
      }
      currentPage={productList.state.page}
      itemPerPage={productList.state.itemPerPage}
      totalItem={productList.state.totalItem}
      onPageChange={(page: number) =>
        productList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      onEmptyActionPress={() => router.push('/products/create')}
      onRetryButtonPress={() => productList.dispatch({ type: 'FETCH' })}
      isRevalidating={productList.state.type === 'revalidating'}
      isChangingParams={productList.state.type === 'changingParams'}
      onSaleTypeChange={(saleType?: SaleType) =>
        productList.dispatch({ type: 'CHANGE_PARAMS', saleType })
      }
      onStatusChange={(status?: StatusFilter) =>
        productList.dispatch({ type: 'CHANGE_PARAMS', status })
      }
      onSearchValueChange={(query: string) =>
        productList.dispatch({ type: 'CHANGE_PARAMS', query })
      }
      onSearchClear={() =>
        productList.dispatch({ type: 'CHANGE_PARAMS', query: '', page: 1 })
      }
      saleType={productList.state.saleType}
      status={productList.state.status}
      searchValue={productList.state.query}
      variant={match(productList.state)
        .returnType<ProductListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          ({ products }) => ({
            type: products.length > 0 ? 'loaded' : 'empty',
            items: products,
          })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      isDeleteButtonDisabled={productDelete.state.type === 'deleting'}
      isDeleteModalOpen={match(productDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      onDeleteCancel={() => productDelete.dispatch({ type: 'HIDE_CONFIRMATION' })}
      onDeleteConfirm={() => productDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
