import { createContext, ReactNode, useContext } from 'react';
import {
  TransactionStatisticListAction,
  TransactionStatisticListState,
  TransactionStatisticListUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  TransactionStatisticListState,
  TransactionStatisticListAction
> | null;

const Context = createContext<ContextValue>(null);

export const useTransactionStatisticListController = () => {
  const transactionPayController = useContext(Context);
  if (transactionPayController === null) {
    throw new Error(
      'useTransactionStatisticListController is called outside provider'
    );
  }

  return transactionPayController;
};

export type TransactionStatisticListProviderProps = {
  children: ReactNode;
  usecase: TransactionStatisticListUsecase;
};

export const TransactionStatisticListProvider = ({
  children,
  usecase,
}: TransactionStatisticListProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
