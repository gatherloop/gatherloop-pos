import { ScrollView } from 'tamagui';
import { TransactionDetail, Layout } from '../components';
import { TransactionCoupon, TransactionItem } from '../../domain';

export type TransactionDetailScreenProps = {
  createdAt: string;
  name: string;
  orderNumber: number;
  total: number;
  transactionItems: TransactionItem[];
  transactionCoupons: TransactionCoupon[];
  paidAt?: string;
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
          orderNumber={props.orderNumber}
          total={props.total}
          transactionItems={props.transactionItems}
          transactionCoupons={props.transactionCoupons}
          paidAt={props.paidAt}
          walletName={props.walletName}
          paidAmount={props.paidAmount}
        />
      </ScrollView>
    </Layout>
  );
};
