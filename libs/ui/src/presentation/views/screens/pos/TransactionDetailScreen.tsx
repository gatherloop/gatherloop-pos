import { ScrollView } from 'tamagui';
import {
  TransactionCompleteAlert,
  TransactionDetail,
  Layout,
} from '../../components';
import {
  PublicTable,
  TransactionCompleteActionType,
  TransactionCoupon,
  TransactionItem,
  TransactionSource,
} from '../../../../domain';

export type TransactionDetailScreenProps = {
  createdAt: string;
  name: string;
  source: TransactionSource;
  table?: PublicTable | null;
  pagerNumber: number;
  transactionNumber: number;
  total: number;
  transactionItems: TransactionItem[];
  transactionCoupons: TransactionCoupon[];
  paidAt?: string;
  completedAt?: string | null;
  walletName?: string;
  paidAmount: number;
  onLogoutPress: () => void;
  onCompleteButtonPress: () => void;
  onUncompleteButtonPress: () => void;
  isCompleteModalOpen: boolean;
  completeAction: TransactionCompleteActionType | null;
  isCompleteButtonDisabled: boolean;
  onCompleteCancel: () => void;
  onCompleteConfirm: () => void;
};

export const TransactionDetailScreen = (
  props: TransactionDetailScreenProps
) => {
  return (
    <Layout
      title="Detail Transaction"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
        <TransactionDetail
          createdAt={props.createdAt}
          name={props.name}
          source={props.source}
          table={props.table}
          pagerNumber={props.pagerNumber}
          transactionNumber={props.transactionNumber}
          total={props.total}
          transactionItems={props.transactionItems}
          transactionCoupons={props.transactionCoupons}
          paidAt={props.paidAt}
          completedAt={props.completedAt}
          walletName={props.walletName}
          paidAmount={props.paidAmount}
          onCompleteButtonPress={props.onCompleteButtonPress}
          onUncompleteButtonPress={props.onUncompleteButtonPress}
        />
      </ScrollView>
      <TransactionCompleteAlert
        isOpen={props.isCompleteModalOpen}
        action={props.completeAction}
        isButtonDisabled={props.isCompleteButtonDisabled}
        onCancel={props.onCompleteCancel}
        onConfirm={props.onCompleteConfirm}
      />
    </Layout>
  );
};
