import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import dayjs from 'dayjs';
import {
  useAuthLogoutController,
  useTransactionDeleteController,
  useTransactionListController,
  useTransactionPayController,
  useTransactionUnpayController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  Transaction,
  TransactionDeleteUsecase,
  TransactionListUsecase,
  TransactionPayUsecase,
  TransactionUnpayUsecase,
  Wallet,
} from '../../domain';
import { TransactionPrintPayload, usePrinter } from '../../utils';
import {
  TransactionListScreen,
  TransactionListScreenProps,
} from './TransactionListScreen';

export type TransactionListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  transactionListUsecase: TransactionListUsecase;
  transactionDeleteUsecase: TransactionDeleteUsecase;
  transactionPayUsecase: TransactionPayUsecase;
  transactionUnpayUsecase: TransactionUnpayUsecase;
};

export const TransactionListHandler = ({
  authLogoutUsecase,
  transactionListUsecase,
  transactionDeleteUsecase,
  transactionPayUsecase,
  transactionUnpayUsecase,
}: TransactionListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const transactionList = useTransactionListController(transactionListUsecase);
  const transactionDelete = useTransactionDeleteController(
    transactionDeleteUsecase
  );
  const transactionPay = useTransactionPayController(transactionPayUsecase);
  const transactionUnpay = useTransactionUnpayController(
    transactionUnpayUsecase
  );
  const router = useRouter();
  const { print } = usePrinter();

  useEffect(() => {
    match(transactionDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        transactionList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // Default case, do nothing
      });
  }, [transactionDelete.state, transactionList]);

  useEffect(() => {
    match(transactionPay.state)
      .with({ type: 'payingSuccess' }, () => {
        transactionList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // Default case, do nothing
      });
  }, [transactionPay.state, transactionList]);

  useEffect(() => {
    match(transactionUnpay.state)
      .with({ type: 'unpayingSuccess' }, () => {
        transactionList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // Default case, do nothing
      });
  }, [transactionUnpay.state, transactionList]);

  const buildPrintTransaction = (
    transaction: Transaction
  ): TransactionPrintPayload['transaction'] => ({
    createdAt: dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm'),
    paidAt: transaction.paidAt
      ? dayjs(transaction.paidAt).format('DD/MM/YYYY HH:mm')
      : undefined,
    name: transaction.name,
    orderNumber: transaction.orderNumber,
    items: transaction.transactionItems
      .sort((a, b) =>
        a.variant.product.name.localeCompare(b.variant.product.name)
      )
      .map(({ variant, amount, discountAmount, note }) => ({
        name: `${variant.product.name} - ${variant.values
          .map(({ optionValue: { name } }) => name)
          .join(' - ')}`,
        price: variant.price,
        amount,
        discountAmount,
        note,
      })),
    coupons: transaction.transactionCoupons.map(({ amount, type, coupon }) => ({
      amount,
      type: type === 'fixed' ? 'FIXED' : 'PERCENTAGE',
      code: coupon.code,
    })),
    isCashless: transaction.wallet?.isCashless ?? false,
    paidAmount: transaction.paidAmount,
  });

  return (
    <TransactionListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onDeleteMenuPress={(transaction) =>
        transactionDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          transactionId: transaction.id,
        })
      }
      onEditMenuPress={(transaction) => {
        const targetPath = transaction.paidAt
          ? `/transactions/${transaction.id}/detail`
          : `/transactions/${transaction.id}`;
        router.push(targetPath);
      }}
      onPayMenuPress={(transaction) =>
        transactionPay.dispatch({
          type: 'SHOW_CONFIRMATION',
          transactionId: transaction.id,
          transactionTotal: transaction.total,
        })
      }
      onUnpayMenuPress={(transaction) =>
        transactionUnpay.dispatch({
          type: 'SHOW_CONFIRMATION',
          transactionId: transaction.id,
        })
      }
      onItemPress={(transaction) => {
        const targetPath = transaction.paidAt
          ? `/transactions/${transaction.id}/detail`
          : `/transactions/${transaction.id}`;
        router.push(targetPath);
      }}
      onPrintInvoiceMenuPress={(transaction) => {
        print({
          type: 'INVOICE',
          transaction: buildPrintTransaction(transaction),
        });
      }}
      onPrintOrderSlipMenuPress={(transaction) => {
        print({
          type: 'ORDER_SLIP',
          transaction: buildPrintTransaction(transaction),
        });
      }}
      onEmptyActionPress={() => router.push('/transactions/create')}
      onRetryButtonPress={() => transactionList.dispatch({ type: 'FETCH' })}
      isRevalidating={transactionList.state.type === 'revalidating'}
      variant={match(transactionList.state)
        .returnType<TransactionListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          () => ({ type: 'loaded' })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      transactions={transactionList.state.transactions}
      searchValue={transactionList.state.query}
      onSearchValueChange={(query: string) =>
        transactionList.dispatch({
          type: 'CHANGE_PARAMS',
          query,
          page: 1,
          fetchDebounceDelay: 600,
        })
      }
      paymentStatus={transactionList.state.paymentStatus}
      onPaymentStatusChange={(paymentStatus) =>
        transactionList.dispatch({
          type: 'CHANGE_PARAMS',
          paymentStatus,
          page: 1,
          fetchDebounceDelay: 600,
        })
      }
      currentPage={transactionList.state.page}
      onPageChange={(page: number) =>
        transactionList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      totalItem={transactionList.state.totalItem}
      itemPerPage={transactionList.state.itemPerPage}
      wallets={transactionList.state.wallets}
      walletId={transactionList.state.walletId}
      onWalletIdChange={(walletId) =>
        transactionList.dispatch({
          type: 'CHANGE_PARAMS',
          walletId,
          page: 1,
          fetchDebounceDelay: 600,
        })
      }
      isDeleteModalOpen={match(transactionDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={transactionDelete.state.type === 'deleting'}
      onDeleteCancel={() =>
        transactionDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => transactionDelete.dispatch({ type: 'DELETE' })}
      isPayModalOpen={
        transactionPay.state.type === 'shown' ||
        transactionPay.state.type === 'paying'
      }
      payForm={transactionPay.form}
      onPayCancel={() => transactionPay.dispatch({ type: 'HIDE_CONFIRMATION' })}
      onPaySubmit={(values: { wallet: Wallet; paidAmount: number }) =>
        transactionPay.dispatch({
          type: 'PAY',
          walletId: values.wallet.id,
          paidAmount: values.paidAmount,
        })
      }
      payWalletSelectOptions={transactionPay.state.wallets.map((wallet) => ({
        label: wallet.name,
        value: wallet,
      }))}
      payTransactionTotal={transactionPay.state.transactionTotal}
      isPayButtonDisabled={
        transactionPay.state.type === 'paying' ||
        transactionPay.state.type === 'payingSuccess' ||
        transactionPay.state.type === 'payingError'
      }
      isUnpayModalOpen={match(transactionUnpay.state.type)
        .with(
          P.union('shown', 'unpaying', 'unpayingError', 'unpayingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isUnpayButtonDisabled={transactionUnpay.state.type === 'unpaying'}
      onUnpayCancel={() =>
        transactionUnpay.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onUnpayConfirm={() => transactionUnpay.dispatch({ type: 'UNPAY' })}
    />
  );
};
