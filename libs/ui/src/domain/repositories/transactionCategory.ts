import { TransactionCategory, TransactionCategoryForm } from '../entities';

export interface TransactionCategoryRepository {
  fetchTransactionCategoryList: () => Promise<TransactionCategory[]>;

  fetchTransactionCategoryById: (
    categoryId: number
  ) => Promise<TransactionCategory>;

  deleteTransactionCategoryById: (categoryId: number) => Promise<void>;

  createTransactionCategory: (
    formValues: TransactionCategoryForm
  ) => Promise<void>;

  updateTransactionCategory: (
    formValues: TransactionCategoryForm,
    transactionCategoryId: number
  ) => Promise<void>;
}
