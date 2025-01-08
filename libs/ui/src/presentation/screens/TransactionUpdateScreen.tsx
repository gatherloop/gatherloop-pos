import { ScrollView } from 'tamagui';
import { TransactionUpdate, Layout, ProductList } from '../components';
import {
  useAuthLogoutController,
  useProductListController,
  useTransactionUpdateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  ProductListUsecase,
  TransactionUpdateUsecase,
} from '../../domain';

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

  return (
    <Layout {...authLogoutController} title="Update Transaction" showBackButton>
      <ScrollView>
        <TransactionUpdate
          {...transactionUpdateController}
          ProductList={
            <ProductList
              {...productListController}
              onItemPress={transactionUpdateController.onAddItem}
              isSearchAutoFocus
            />
          }
        />
      </ScrollView>
    </Layout>
  );
};
