import { ScrollView } from 'tamagui';
import { TransactionCreate, Layout, ProductList } from '../components';
import {
  useProductListController,
  useTransactionCreateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { ProductListUsecase, TransactionCreateUsecase } from '../../domain';

export type TransactionCreateScreenProps = {
  transactionCreateUsecase: TransactionCreateUsecase;
  productListUsecase: ProductListUsecase;
};

export const TransactionCreateScreen = (
  props: TransactionCreateScreenProps
) => {
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
    <Layout title="Create Transaction" showBackButton>
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
