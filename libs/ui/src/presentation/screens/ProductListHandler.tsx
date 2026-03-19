import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Product,
  ProductDeleteUsecase,
  ProductListUsecase,
  SaleType,
} from '../../domain';
import { ProductListScreen, ProductListScreenProps } from './ProductListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useProductDeleteController,
  useProductListController,
} from '../controllers';

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
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const productList = useProductListController(productListUsecase);
  const productDelete = useProductDeleteController(productDeleteUsecase);
  const router = useRouter();

  useEffect(() => {
    match(productDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        productList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // NOTHING TODO
      });
  }, [productDelete.state, productList]);

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
      onRetryButtonPress={() => productList.dispatch({ type: 'FETCH' })}
      onSaleTypeChange={(saleType?: SaleType) =>
        productList.dispatch({ type: 'CHANGE_PARAMS', saleType })
      }
      onSearchValueChange={(query: string) =>
        productList.dispatch({ type: 'CHANGE_PARAMS', query })
      }
      saleType={productList.state.saleType}
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
