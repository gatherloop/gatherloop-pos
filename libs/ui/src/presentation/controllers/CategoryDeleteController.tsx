import { createContext, ReactNode, useContext } from 'react';
import {
  CategoryDeleteAction,
  CategoryDeleteState,
  CategoryDeleteUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  CategoryDeleteState,
  CategoryDeleteAction
> | null;

const Context = createContext<ContextValue>(null);

export const useCategoryDeleteController = () => {
  const categoryDeleteController = useContext(Context);
  if (categoryDeleteController === null) {
    throw new Error('useCategoryDeleteController is called outside provider');
  }

  return categoryDeleteController;
};

export type CategoryDeleteProviderProps = {
  children: ReactNode;
  usecase: CategoryDeleteUsecase;
};

export const CategoryDeleteProvider = ({
  children,
  usecase,
}: CategoryDeleteProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
