import { createContext, ReactNode, useContext } from 'react';
import {
  CategoryCreateAction,
  CategoryCreateState,
  CategoryCreateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  CategoryCreateState,
  CategoryCreateAction
> | null;

const Context = createContext<ContextValue>(null);

export const useCategoryCreateController = () => {
  const categoryCreateController = useContext(Context);
  if (categoryCreateController === null) {
    throw new Error('useCategoryCreateController is called outside provider');
  }

  return categoryCreateController;
};

export type CategoryCreateProviderProps = {
  children: ReactNode;
  usecase: CategoryCreateUsecase;
};

export const CategoryCreateProvider = ({
  children,
  usecase,
}: CategoryCreateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
