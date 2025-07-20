import { ScrollView } from 'tamagui';
import { TransactionFormView, Layout, ProductList } from '../components';
import {
  useAuthLogoutController,
  useProductListController,
  useTransactionUpdateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Product,
  ProductListUsecase,
  TransactionForm,
  TransactionUpdateUsecase,
} from '../../domain';
import { UseFieldArrayReturn } from 'react-hook-form';

export type TransactionUpdateScreenProps = {
  transactionUpdateUsecase: TransactionUpdateUsecase;
  productListUsecase: ProductListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionUpdateScreen = (
  props: TransactionUpdateScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const transactionUpdateController = useTransactionUpdateController(
    props.transactionUpdateUsecase
  );

  const productListController = useProductListController(
    props.productListUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (transactionUpdateController.state.type === 'submitSuccess')
      router.push('/transactions');
  }, [transactionUpdateController.state.type, router]);

  const onProductItemPress = (
    product: Product,
    fieldArray: UseFieldArrayReturn<TransactionForm, 'transactionItems', 'key'>
  ) => {
    transactionUpdateController.onAddItem(product, fieldArray);
    productListController.onSearchValueChange('');
  };

  return (
    <Layout {...authLogoutController} title="Update Transaction" showBackButton>
      <ScrollView>
        <TransactionFormView
          {...transactionUpdateController}
          ProductList={(fieldArray) => (
            <ProductList
              {...productListController}
              onItemPress={(product) => onProductItemPress(product, fieldArray)}
              isSearchAutoFocus
              numColumns={2}
            />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
