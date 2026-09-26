import { Button, XStack } from 'tamagui';
import {
  Layout,
  TransactionList,
  TransactionCompleteAlert,
  TransactionDeleteAlert,
  TransactionPaymentAlert,
  TransactionUnpayAlert,
  TransactionVerificationSheet,
  TransactionVerificationSheetVariant,
} from '../../components';
import { Link } from 'solito/link';
import { Plus, RefreshCw } from '@tamagui/lucide-icons';
import {
  Transaction,
  TransactionCompleteActionType,
  TransactionFulfillmentFilter,
  TransactionPayForm,
  TransactionSourceFilter,
  Wallet,
} from '../../../../domain';

export type TransactionListScreenProps = {
  onLogoutPress: () => void;
  onDeleteMenuPress: (transaction: Transaction) => void;
  onEditMenuPress: (transaction: Transaction) => void;
  onPayMenuPress: (transaction: Transaction) => void;
  onUnpayMenuPress: (transaction: Transaction) => void;
  onCompleteMenuPress: (transaction: Transaction) => void;
  onUncompleteMenuPress: (transaction: Transaction) => void;
  onItemPress: (transaction: Transaction) => void;
  onPrintInvoiceMenuPress: (transaction: Transaction) => void;
  onPrintOrderSlipMenuPress: (transaction: Transaction) => void;
  onVerifyMenuPress: (transaction: Transaction) => void;
  onRetryButtonPress: () => void;
  onRefreshPress: () => void;
  isRefreshButtonDisabled: boolean;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
  transactions: Transaction[];
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  paymentStatus: 'all' | 'paid' | 'unpaid';
  onPaymentStatusChange: (paymentStatus: 'all' | 'paid' | 'unpaid') => void;
  source: TransactionSourceFilter;
  onSourceChange: (source: TransactionSourceFilter) => void;
  fulfillment: TransactionFulfillmentFilter;
  onFulfillmentChange: (fulfillment: TransactionFulfillmentFilter) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  wallets: Wallet[];
  walletId: number | null;
  onWalletIdChange: (walletId: number | null) => void;
  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  isPayModalOpen: boolean;
  onPayCancel: () => void;
  onPaySubmit: (values: TransactionPayForm) => void;
  payWalletSelectOptions: { label: string; value: Wallet }[];
  payTransactionTotal: number;
  isPayButtonDisabled: boolean;
  isUnpayModalOpen: boolean;
  isUnpayButtonDisabled: boolean;
  onUnpayCancel: () => void;
  onUnpayConfirm: () => void;
  isCompleteModalOpen: boolean;
  completeAction: TransactionCompleteActionType | null;
  isCompleteButtonDisabled: boolean;
  onCompleteCancel: () => void;
  onCompleteConfirm: () => void;
  isVerificationSheetOpen: boolean;
  verificationVariant: TransactionVerificationSheetVariant;
  verifyingTransaction: Transaction | null;
  verificationPhoto: string | null;
  verificationCapturedAt: string | null;
  verificationErrorMessage?: string | null;
  onVerificationClose: () => void;
  onVerificationApprove: () => void;
  onVerificationRejectPress: () => void;
  onVerificationRejectCancel: () => void;
  onVerificationRejectConfirm: () => void;
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
  onCompleteMenuPress,
  onUncompleteMenuPress,
  onItemPress,
  onPrintInvoiceMenuPress,
  onPrintOrderSlipMenuPress,
  onVerifyMenuPress,
  onRetryButtonPress,
  onRefreshPress,
  isRefreshButtonDisabled,
  variant,
  transactions,
  searchValue,
  onSearchValueChange,
  paymentStatus,
  onPaymentStatusChange,
  source,
  onSourceChange,
  fulfillment,
  onFulfillmentChange,
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
  onPayCancel,
  onPaySubmit,
  payWalletSelectOptions,
  payTransactionTotal,
  isPayButtonDisabled,
  isUnpayModalOpen,
  isUnpayButtonDisabled,
  onUnpayCancel,
  onUnpayConfirm,
  isCompleteModalOpen,
  completeAction,
  isCompleteButtonDisabled,
  onCompleteCancel,
  onCompleteConfirm,
  isVerificationSheetOpen,
  verificationVariant,
  verifyingTransaction,
  verificationPhoto,
  verificationCapturedAt,
  verificationErrorMessage,
  onVerificationClose,
  onVerificationApprove,
  onVerificationRejectPress,
  onVerificationRejectCancel,
  onVerificationRejectConfirm,
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
        <XStack gap="$2">
          <Button
            size="$3"
            icon={RefreshCw}
            variant="outlined"
            onPress={onRefreshPress}
            disabled={isRefreshButtonDisabled}
            accessibilityLabel="Refresh transactions"
          />
          <Link href="/transactions/create">
            <Button size="$3" icon={Plus} variant="outlined" disabled />
          </Link>
        </XStack>
      }
    >
      <TransactionList
        searchValue={searchValue}
        onSearchValueChange={onSearchValueChange}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={onPaymentStatusChange}
        source={source}
        onSourceChange={onSourceChange}
        fulfillment={fulfillment}
        onFulfillmentChange={onFulfillmentChange}
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
        onCompleteMenuPress={onCompleteMenuPress}
        onUncompleteMenuPress={onUncompleteMenuPress}
        onPrintInvoiceMenuPress={onPrintInvoiceMenuPress}
        onPrintOrderSlipMenuPress={onPrintOrderSlipMenuPress}
        onVerifyMenuPress={onVerifyMenuPress}
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
      <TransactionCompleteAlert
        isOpen={isCompleteModalOpen}
        action={completeAction}
        isButtonDisabled={isCompleteButtonDisabled}
        onCancel={onCompleteCancel}
        onConfirm={onCompleteConfirm}
      />
      <TransactionVerificationSheet
        isOpen={isVerificationSheetOpen}
        variant={verificationVariant}
        transaction={verifyingTransaction}
        photo={verificationPhoto}
        capturedAt={verificationCapturedAt}
        errorMessage={verificationErrorMessage}
        onClose={onVerificationClose}
        onApprovePress={onVerificationApprove}
        onRejectPress={onVerificationRejectPress}
        onRejectCancel={onVerificationRejectCancel}
        onRejectConfirm={onVerificationRejectConfirm}
      />
    </Layout>
  );
};
