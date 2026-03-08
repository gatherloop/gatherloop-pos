import { match, P } from 'ts-pattern';
import {
  useAuthLogoutController,
  useTransactionStatisticListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  TransactionStatisticListUsecase,
} from '../../domain';
import {
  TransactionStatisticScreen,
  TransactionStatisticScreenProps,
} from './TransactionStatisticScreen';

export type TransactionStatisticHandlerProps = {
  transactionStatisticListUsecase: TransactionStatisticListUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionStatisticHandler = ({
  transactionStatisticListUsecase,
  authLogoutUsecase,
}: TransactionStatisticHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const transactionStatisticList =
    useTransactionStatisticListController(transactionStatisticListUsecase);

  return (
    <TransactionStatisticScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onGroupByChange={(groupBy) =>
        transactionStatisticList.dispatch({ type: 'SET_GROUP_BY', groupBy })
      }
      onRetryButtonPress={() =>
        transactionStatisticList.dispatch({ type: 'FETCH' })
      }
      variant={match(transactionStatisticList.state)
        .returnType<TransactionStatisticScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      totalStatistics={transactionStatisticList.state.transactionStatistics.map(
        (statistic) => ({ y: statistic.total, x: statistic.date })
      )}
      totalIncomeStatistics={transactionStatisticList.state.transactionStatistics.map(
        (statistic) => ({ y: statistic.totalIncome, x: statistic.date })
      )}
      groupBy={transactionStatisticList.state.groupBy}
    />
  );
};
