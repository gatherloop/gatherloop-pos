import { createContext, ReactNode, useContext } from 'react';
import {
  ProductUpdateAction,
  ProductUpdateState,
  ProductUpdateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<ProductUpdateState, ProductUpdateAction> | null;

const Context = createContext<ContextValue>(null);

export const useProductUpdateController = () => {
  const productUpdateController = useContext(Context);
  if (productUpdateController === null) {
    throw new Error('useProductUpdateController is called outside provider');
  }

  return productUpdateController;
};

export type ProductUpdateProviderProps = {
  children: ReactNode;
  usecase: ProductUpdateUsecase;
};

export const ProductUpdateProvider = ({
  children,
  usecase,
}: ProductUpdateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
