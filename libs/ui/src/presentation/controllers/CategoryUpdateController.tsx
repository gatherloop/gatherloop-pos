import { createContext, ReactNode, useContext } from 'react';
import {
  CategoryUpdateAction,
  CategoryUpdateState,
  CategoryUpdateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  CategoryUpdateState,
  CategoryUpdateAction
> | null;

const Context = createContext<ContextValue>(null);

export const useCategoryUpdateController = () => {
  const categoryUpdateController = useContext(Context);
  if (categoryUpdateController === null) {
    throw new Error('useCategoryUpdateController is called outside provider');
  }

  return categoryUpdateController;
};

export type CategoryUpdateProviderProps = {
  children: ReactNode;
  usecase: CategoryUpdateUsecase;
};

export const CategoryUpdateProvider = ({
  children,
  usecase,
}: CategoryUpdateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
