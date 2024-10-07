import {
  OpenAPIProductRepository,
  OpenAPITransactionRepository,
} from '../data';
import { ProductListUsecase, TransactionCreateUsecase } from '../domain';
import {
  ProductListProvider,
  TransactionCreateProvider,
  TransactionCreateScreen as TransactionCreateScreenView,
} from '../presentation';
import { useQueryClient } from '@tanstack/react-query';

export function TransactionCreateScreen() {
  const client = useQueryClient();
  const transactionRepository = new OpenAPITransactionRepository(client);
  const transactionCreateUsecase = new TransactionCreateUsecase(
    transactionRepository
  );
  const productRepository = new OpenAPIProductRepository(client);
  const productListUsecase = new ProductListUsecase(productRepository);
  return (
    <TransactionCreateProvider usecase={transactionCreateUsecase}>
      <ProductListProvider usecase={productListUsecase}>
        <TransactionCreateScreenView />
      </ProductListProvider>
    </TransactionCreateProvider>
  );
}
