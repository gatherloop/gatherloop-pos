import { createContext, ReactNode, useContext } from 'react';
import {
  MaterialCreateAction,
  MaterialCreateState,
  MaterialCreateUsecase,
} from '../../domain';
import { Controller, useController } from './controller';

type ContextValue = Controller<
  MaterialCreateState,
  MaterialCreateAction
> | null;

const Context = createContext<ContextValue>(null);

export const useMaterialCreateController = () => {
  const materialCreateController = useContext(Context);
  if (materialCreateController === null) {
    throw new Error('useMaterialCreateController is called outside provider');
  }

  return materialCreateController;
};

export type MaterialCreateProviderProps = {
  children: ReactNode;
  usecase: MaterialCreateUsecase;
};

export const MaterialCreateProvider = ({
  children,
  usecase,
}: MaterialCreateProviderProps) => {
  const controller = useController(usecase);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
};
