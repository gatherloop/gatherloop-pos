import { createContext, ReactNode, useContext } from 'react';
import {
  ExpenseUpdateAction,
  ExpenseUpdateState,
  ExpenseUpdateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<ExpenseUpdateState, ExpenseUpdateAction> | null;

const Context = createContext<ContextValue>(null);

export const useExpenseUpdateController = () => {
  const expenseUpdateController = useContext(Context);
  if (expenseUpdateController === null) {
    throw new Error('useExpenseUpdateController is called outside provider');
  }

  return expenseUpdateController;
};

export type ExpenseUpdateProviderProps = {
  children: ReactNode;
  usecase: ExpenseUpdateUsecase;
};

export const ExpenseUpdateProvider = ({
  children,
  usecase,
}: ExpenseUpdateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
