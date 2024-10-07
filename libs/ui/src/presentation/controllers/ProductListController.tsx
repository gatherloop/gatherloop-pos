import { createContext, ReactNode, useContext } from 'react';
import {
  ProductListAction,
  ProductListState,
  ProductListUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<ProductListState, ProductListAction> | null;

const Context = createContext<ContextValue>(null);

export const useProductListController = () => {
  const productListController = useContext(Context);
  if (productListController === null) {
    throw new Error('useProductListController is called outside provider');
  }

  return productListController;
};

export type ProductListProviderProps = {
  children: ReactNode;
  usecase: ProductListUsecase;
};

export const ProductListProvider = ({
  children,
  usecase,
}: ProductListProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
