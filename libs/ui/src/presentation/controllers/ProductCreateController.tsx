import { createContext, ReactNode, useContext } from 'react';
import {
  ProductCreateAction,
  ProductCreateState,
  ProductCreateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<ProductCreateState, ProductCreateAction> | null;

const Context = createContext<ContextValue>(null);

export const useProductCreateController = () => {
  const productCreateController = useContext(Context);
  if (productCreateController === null) {
    throw new Error('useProductCreateController is called outside provider');
  }

  return productCreateController;
};

export type ProductCreateProviderProps = {
  children: ReactNode;
  usecase: ProductCreateUsecase;
};

export const ProductCreateProvider = ({
  children,
  usecase,
}: ProductCreateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
