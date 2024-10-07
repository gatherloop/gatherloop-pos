import { createContext, ReactNode, useContext } from 'react';
import {
  MaterialUpdateAction,
  MaterialUpdateState,
  MaterialUpdateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  MaterialUpdateState,
  MaterialUpdateAction
> | null;

const Context = createContext<ContextValue>(null);

export const useMaterialUpdateController = () => {
  const materialUpdateController = useContext(Context);
  if (materialUpdateController === null) {
    throw new Error('useMaterialUpdateController is called outside provider');
  }

  return materialUpdateController;
};

export type MaterialUpdateProviderProps = {
  children: ReactNode;
  usecase: MaterialUpdateUsecase;
};

export const MaterialUpdateProvider = ({
  children,
  usecase,
}: MaterialUpdateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
