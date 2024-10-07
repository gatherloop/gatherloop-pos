import { createContext, ReactNode, useContext } from 'react';
import {
  BudgetListAction,
  BudgetListState,
  BudgetListUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<BudgetListState, BudgetListAction> | null;

const Context = createContext<ContextValue>(null);

export const useBudgetListController = () => {
  const budgetListController = useContext(Context);
  if (budgetListController === null) {
    throw new Error('useBudgetListController is called outside provider');
  }

  return budgetListController;
};

export type BudgetListProviderProps = {
  children: ReactNode;
  usecase: BudgetListUsecase;
};

export const BudgetListProvider = ({
  children,
  usecase,
}: BudgetListProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
