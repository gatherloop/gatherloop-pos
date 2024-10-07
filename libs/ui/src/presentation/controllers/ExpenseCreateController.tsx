import { createContext, ReactNode, useContext } from 'react';
import {
  ExpenseCreateAction,
  ExpenseCreateState,
  ExpenseCreateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<ExpenseCreateState, ExpenseCreateAction> | null;

const Context = createContext<ContextValue>(null);

export const useExpenseCreateController = () => {
  const expenseCreateController = useContext(Context);
  if (expenseCreateController === null) {
    throw new Error('useExpenseCreateController is called outside provider');
  }

  return expenseCreateController;
};

export type ExpenseCreateProviderProps = {
  children: ReactNode;
  usecase: ExpenseCreateUsecase;
};

export const ExpenseCreateProvider = ({
  children,
  usecase,
}: ExpenseCreateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
