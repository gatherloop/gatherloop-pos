import { createContext, ReactNode, useContext } from 'react';
import {
  CategoryListAction,
  CategoryListState,
  CategoryListUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<CategoryListState, CategoryListAction> | null;

const Context = createContext<ContextValue>(null);

export const useCategoryListController = () => {
  const categoryListController = useContext(Context);
  if (categoryListController === null) {
    throw new Error('useCategoryListController is called outside provider');
  }

  return categoryListController;
};

export type CategoryListProviderProps = {
  children: ReactNode;
  usecase: CategoryListUsecase;
};

export const CategoryListProvider = ({
  children,
  usecase,
}: CategoryListProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
