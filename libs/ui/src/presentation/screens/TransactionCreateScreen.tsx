import { ScrollView } from 'tamagui';
import { TransactionCreate, Layout, ProductList } from '../components';
import {
  useAuthLogoutController,
  useProductListController,
  useTransactionCreateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  ProductListUsecase,
  TransactionCreateUsecase,
} from '../../domain';

export type TransactionCreateScreenProps = {
  transactionCreateUsecase: TransactionCreateUsecase;
  productListUsecase: ProductListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionCreateScreen = (
  props: TransactionCreateScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const transactionCreateController = useTransactionCreateController(
    props.transactionCreateUsecase
  );
  const productListController = useProductListController(
    props.productListUsecase
  );
  const router = useRouter();

  useEffect(() => {
    if (transactionCreateController.state.type === 'submitSuccess')
      router.push('/transactions');
  }, [transactionCreateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Create Transaction" showBackButton>
      <ScrollView>
        <TransactionCreate
          {...transactionCreateController}
          ProductList={
            <ProductList
              {...productListController}
              onItemPress={transactionCreateController.onAddItem}
              isSearchAutoFocus
            />
          }
        />
      </ScrollView>
    </Layout>
  );
};
