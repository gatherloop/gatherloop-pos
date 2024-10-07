import { createContext, ReactNode, useContext } from 'react';
import {
  MaterialListAction,
  MaterialListState,
  MaterialListUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<MaterialListState, MaterialListAction> | null;

const Context = createContext<ContextValue>(null);

export const useMaterialListController = () => {
  const materialListController = useContext(Context);
  if (materialListController === null) {
    throw new Error('useMaterialListController is called outside provider');
  }

  return materialListController;
};

export type MaterialListProviderProps = {
  children: ReactNode;
  usecase: MaterialListUsecase;
};

export const MaterialListProvider = ({
  children,
  usecase,
}: MaterialListProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
