import { createContext, ReactNode, useContext } from 'react';
import {
  ExpenseListAction,
  ExpenseListState,
  ExpenseListUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<ExpenseListState, ExpenseListAction> | null;

const Context = createContext<ContextValue>(null);

export const useExpenseListController = () => {
  const expenseListController = useContext(Context);
  if (expenseListController === null) {
    throw new Error('useExpenseListController is called outside provider');
  }

  return expenseListController;
};

export type ExpenseListProviderProps = {
  children: ReactNode;
  usecase: ExpenseListUsecase;
};

export const ExpenseListProvider = ({
  children,
  usecase,
}: ExpenseListProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
