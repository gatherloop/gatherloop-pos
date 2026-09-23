import { useEffect } from 'react';
import { match, P } from 'ts-pattern';
import { useUsecase, useAuthLogout, useTransactionComplete } from '../hooks';
import {
  AuthLogoutUsecase,
  TransactionCompleteUsecase,
  TransactionDetailUsecase,
} from '../../../domain';
import { TransactionDetailScreen } from '../../views/screens/pos/TransactionDetailScreen';

export type TransactionDetailHandlerProps = {
  transactionDetailUsecase: TransactionDetailUsecase;
  transactionCompleteUsecase: TransactionCompleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionDetailHandler = ({
  transactionDetailUsecase,
  transactionCompleteUsecase,
  authLogoutUsecase,
}: TransactionDetailHandlerProps) => {
  const transactionDetail = useUsecase(transactionDetailUsecase);
  const transactionComplete = useTransactionComplete(transactionCompleteUsecase);
  const authLogout = useAuthLogout(authLogoutUsecase);

  useEffect(() => {
    match(transactionComplete.state)
      .with({ type: 'completingSuccess' }, () => {
        transactionDetail.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // Default case, do nothing
      });
  }, [transactionComplete.state, transactionDetail]);

  const transactionId = transactionDetail.state.transaction?.id ?? null;

  return (
    <TransactionDetailScreen
      createdAt={transactionDetail.state.transaction?.createdAt ?? ''}
      name={transactionDetail.state.transaction?.name ?? ''}
      source={transactionDetail.state.transaction?.source ?? 'pos'}
      paymentMethod={transactionDetail.state.transaction?.paymentMethod ?? null}
      table={transactionDetail.state.transaction?.table ?? null}
      pagerNumber={transactionDetail.state.transaction?.pagerNumber ?? 0}
      transactionNumber={
        transactionDetail.state.transaction?.transactionNumber ?? 0
      }
      total={transactionDetail.state.transaction?.total ?? 0}
      transactionItems={
        transactionDetail.state.transaction?.transactionItems ?? []
      }
      transactionCoupons={
        transactionDetail.state.transaction?.transactionCoupons ?? []
      }
      paidAt={transactionDetail.state.transaction?.paidAt ?? undefined}
      completedAt={transactionDetail.state.transaction?.completedAt ?? null}
      walletName={transactionDetail.state.transaction?.wallet?.name}
      paidAmount={transactionDetail.state.transaction?.paidAmount ?? 0}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onCompleteButtonPress={() => {
        if (transactionId === null) return;
        transactionComplete.dispatch({
          type: 'SHOW_CONFIRMATION',
          transactionId,
          action: 'complete',
        });
      }}
      onUncompleteButtonPress={() => {
        if (transactionId === null) return;
        transactionComplete.dispatch({
          type: 'SHOW_CONFIRMATION',
          transactionId,
          action: 'uncomplete',
        });
      }}
      isCompleteModalOpen={match(transactionComplete.state.type)
        .with(
          P.union(
            'shown',
            'completing',
            'completingError',
            'completingSuccess'
          ),
          () => true
        )
        .otherwise(() => false)}
      completeAction={transactionComplete.state.action}
      isCompleteButtonDisabled={transactionComplete.state.type === 'completing'}
      onCompleteCancel={() =>
        transactionComplete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onCompleteConfirm={() =>
        transactionComplete.dispatch({ type: 'COMPLETE' })
      }
    />
  );
};
