import { Button } from 'tamagui';
import {
  Layout,
  TransactionList,
  TransactionDeleteAlert,
  TransactionPaymentAlert,
  TransactionUnpayAlert,
} from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { Transaction, Wallet } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type TransactionListScreenProps = {
  onLogoutPress: () => void;
  onDeleteMenuPress: (transaction: Transaction) => void;
  onEditMenuPress: (transaction: Transaction) => void;
  onPayMenuPress: (transaction: Transaction) => void;
  onUnpayMenuPress: (transaction: Transaction) => void;
  onItemPress: (transaction: Transaction) => void;
  onPrintInvoiceMenuPress: (transaction: Transaction) => void;
  onPrintOrderSlipMenuPress: (transaction: Transaction) => void;
  onRetryButtonPress: () => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  transactions: Transaction[];
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  paymentStatus: 'all' | 'paid' | 'unpaid';
  onPaymentStatusChange: (paymentStatus: 'all' | 'paid' | 'unpaid') => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  wallets: Wallet[];
  walletId: number | null;
  onWalletIdChange: (walletId: number | null) => void;
  // Delete alert
  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  // Pay alert
  isPayModalOpen: boolean;
  payForm: UseFormReturn<{ wallet: Wallet; paidAmount: number }>;
  onPayCancel: () => void;
  onPaySubmit: (values: { wallet: Wallet; paidAmount: number }) => void;
  payWalletSelectOptions: { label: string; value: Wallet }[];
  payTransactionTotal: number;
  isPayButtonDisabled: boolean;
  // Unpay alert
  isUnpayModalOpen: boolean;
  isUnpayButtonDisabled: boolean;
  onUnpayCancel: () => void;
  onUnpayConfirm: () => void;
  isRevalidating?: boolean;
  isChangingParams?: boolean;
  onSearchClear?: () => void;
  onEmptyActionPress?: () => void;
};

export const TransactionListScreen = ({
  onLogoutPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onPayMenuPress,
  onUnpayMenuPress,
  onItemPress,
  onPrintInvoiceMenuPress,
  onPrintOrderSlipMenuPress,
  onRetryButtonPress,
  variant,
  transactions,
  searchValue,
  onSearchValueChange,
  paymentStatus,
  onPaymentStatusChange,
  currentPage,
  onPageChange,
  totalItem,
  itemPerPage,
  wallets,
  walletId,
  onWalletIdChange,
  isDeleteModalOpen,
  isDeleteButtonDisabled,
  onDeleteCancel,
  onDeleteConfirm,
  isPayModalOpen,
  payForm,
  onPayCancel,
  onPaySubmit,
  payWalletSelectOptions,
  payTransactionTotal,
  isPayButtonDisabled,
  isUnpayModalOpen,
  isUnpayButtonDisabled,
  onUnpayCancel,
  onUnpayConfirm,
  isRevalidating,
  isChangingParams,
  onSearchClear,
  onEmptyActionPress,
}: TransactionListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Transactions"
      rightActionItem={
        <Link href="/transactions/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <TransactionList
        searchValue={searchValue}
        onSearchValueChange={onSearchValueChange}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={onPaymentStatusChange}
        variant={variant}
        transactions={transactions}
        currentPage={currentPage}
        onPageChange={onPageChange}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
        onRetryButtonPress={onRetryButtonPress}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onPayMenuPress={onPayMenuPress}
        onUnpayMenuPress={onUnpayMenuPress}
        onPrintInvoiceMenuPress={onPrintInvoiceMenuPress}
        onPrintOrderSlipMenuPress={onPrintOrderSlipMenuPress}
        onItemPress={onItemPress}
        wallets={wallets}
        walletId={walletId}
        onWalletIdChange={onWalletIdChange}
        isRevalidating={isRevalidating}
        isChangingParams={isChangingParams}
        onSearchClear={onSearchClear}
        onEmptyActionPress={onEmptyActionPress}
      />
      <TransactionDeleteAlert
        isOpen={isDeleteModalOpen}
        isButtonDisabled={isDeleteButtonDisabled}
        onCancel={onDeleteCancel}
        onButtonConfirmPress={onDeleteConfirm}
      />
      <TransactionPaymentAlert
        isOpen={isPayModalOpen}
        form={payForm}
        onSubmit={onPaySubmit}
        onCancel={onPayCancel}
        walletSelectOptions={payWalletSelectOptions}
        transactionTotal={payTransactionTotal}
        isButtonDisabled={isPayButtonDisabled}
      />
      <TransactionUnpayAlert
        isOpen={isUnpayModalOpen}
        isButtonDisabled={isUnpayButtonDisabled}
        onCancel={onUnpayCancel}
        onConfirm={onUnpayConfirm}
      />
    </Layout>
  );
};
