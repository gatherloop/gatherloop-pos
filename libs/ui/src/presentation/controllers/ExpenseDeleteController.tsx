import { createContext, ReactNode, useContext } from 'react';
import {
  ExpenseDeleteAction,
  ExpenseDeleteState,
  ExpenseDeleteUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<ExpenseDeleteState, ExpenseDeleteAction> | null;

const Context = createContext<ContextValue>(null);

export const useExpenseDeleteController = () => {
  const expenseDeleteController = useContext(Context);
  if (expenseDeleteController === null) {
    throw new Error('useExpenseDeleteController is called outside provider');
  }

  return expenseDeleteController;
};

export type ExpenseDeleteProviderProps = {
  children: ReactNode;
  usecase: ExpenseDeleteUsecase;
};

export const ExpenseDeleteProvider = ({
  children,
  usecase,
}: ExpenseDeleteProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
