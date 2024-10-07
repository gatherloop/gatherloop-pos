import { createContext, ReactNode, useContext } from 'react';
import {
  ProductDeleteAction,
  ProductDeleteState,
  ProductDeleteUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<ProductDeleteState, ProductDeleteAction> | null;

const Context = createContext<ContextValue>(null);

export const useProductDeleteController = () => {
  const productDeleteController = useContext(Context);
  if (productDeleteController === null) {
    throw new Error('useProductDeleteController is called outside provider');
  }

  return productDeleteController;
};

export type ProductDeleteProviderProps = {
  children: ReactNode;
  usecase: ProductDeleteUsecase;
};

export const ProductDeleteProvider = ({
  children,
  usecase,
}: ProductDeleteProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
