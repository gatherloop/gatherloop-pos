import { createContext, ReactNode, useContext } from 'react';
import {
  TransactionUpdateAction,
  TransactionUpdateState,
  TransactionUpdateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  TransactionUpdateState,
  TransactionUpdateAction
> | null;

const Context = createContext<ContextValue>(null);

export const useTransactionUpdateController = () => {
  const transactionUpdateController = useContext(Context);
  if (transactionUpdateController === null) {
    throw new Error(
      'useTransactionUpdateController is called outside provider'
    );
  }

  return transactionUpdateController;
};

export type TransactionUpdateProviderProps = {
  children: ReactNode;
  usecase: TransactionUpdateUsecase;
};

export const TransactionUpdateProvider = ({
  children,
  usecase,
}: TransactionUpdateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
