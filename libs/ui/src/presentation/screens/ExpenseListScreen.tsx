import { Button } from 'tamagui';
import {
  ExpenseList,
  ExpenseDeleteAlert,
  Layout,
  ExpenseListProps,
} from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { Expense } from '../../domain';

export type ExpenseListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (expense: Expense) => void;
  onDeleteMenuPress: (expense: Expense) => void;
  onItemPress: (expense: Expense) => void;
  onRetryButtonPress: () => void;
  variant: ExpenseListProps['variant'];
  expenses: Expense[];
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  wallets: ExpenseListProps['wallets'];
  walletId: number | null;
  onWalletIdChange: (walletId: number | null) => void;
  budgets: ExpenseListProps['budgets'];
  budgetId: number | null;
  onBudgetIdChange: (budgetId: number | null) => void;
  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  onDeleteCancel: () => void;
  onDeleteButtonConfirmPress: () => void;
  isRevalidating?: boolean;
  onEmptyActionPress?: () => void;
};

export const ExpenseListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
  expenses,
  searchValue,
  onSearchValueChange,
  currentPage,
  onPageChange,
  totalItem,
  itemPerPage,
  wallets,
  walletId,
  onWalletIdChange,
  budgets,
  budgetId,
  onBudgetIdChange,
  isDeleteModalOpen,
  isDeleteButtonDisabled,
  onDeleteCancel,
  onDeleteButtonConfirmPress,
  isRevalidating,
  onEmptyActionPress,
}: ExpenseListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Expenses"
      rightActionItem={
        <Link href="/expenses/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ExpenseList
        variant={variant}
        expenses={expenses}
        searchValue={searchValue}
        onSearchValueChange={onSearchValueChange}
        currentPage={currentPage}
        onPageChange={onPageChange}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
        wallets={wallets}
        walletId={walletId}
        onWalletIdChange={onWalletIdChange}
        budgets={budgets}
        budgetId={budgetId}
        onBudgetIdChange={onBudgetIdChange}
        onRetryButtonPress={onRetryButtonPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onItemPress={onItemPress}
        isRevalidating={isRevalidating}
        onEmptyActionPress={onEmptyActionPress}
      />
      <ExpenseDeleteAlert
        isOpen={isDeleteModalOpen}
        isButtonDisabled={isDeleteButtonDisabled}
        onCancel={onDeleteCancel}
        onButtonConfirmPress={onDeleteButtonConfirmPress}
      />
    </Layout>
  );
};
