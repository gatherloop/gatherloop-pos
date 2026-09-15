import { ScrollView } from 'tamagui';
import { TransactionDetail, Layout } from '../../components';
import {
  PublicTable,
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
        />
      </ScrollView>
    </Layout>
  );
};
