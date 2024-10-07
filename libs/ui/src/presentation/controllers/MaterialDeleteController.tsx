import { createContext, ReactNode, useContext } from 'react';
import {
  MaterialDeleteAction,
  MaterialDeleteState,
  MaterialDeleteUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  MaterialDeleteState,
  MaterialDeleteAction
> | null;

const Context = createContext<ContextValue>(null);

export const useMaterialDeleteController = () => {
  const materialDeleteController = useContext(Context);
  if (materialDeleteController === null) {
    throw new Error('useMaterialDeleteController is called outside provider');
  }

  return materialDeleteController;
};

export type MaterialDeleteProviderProps = {
  children: ReactNode;
  usecase: MaterialDeleteUsecase;
};

export const MaterialDeleteProvider = ({
  children,
  usecase,
}: MaterialDeleteProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
