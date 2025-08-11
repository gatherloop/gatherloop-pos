import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { ConfirmationAlert, ConfirmationAlertProps } from './ConfirmationAlert';

export type ConfirmationAlertParams = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
};

export type ConfirmationAlertContextValue = {
  show: (params: ConfirmationAlertParams) => void;
};

const ConfirmationAlertContext = createContext<ConfirmationAlertContextValue>({
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  show: () => {},
});

export const useConfirmationAlert = () => useContext(ConfirmationAlertContext);

export type ConfirmationAlertProviderProps = {
  children: ReactNode;
};

export const ConfirmationAlertProvider = ({
  children,
}: ConfirmationAlertProviderProps) => {
  const [props, setProps] = useState<
    Omit<ConfirmationAlertProps, 'onOpenChange'>
  >({
    title: '',
    description: '',
    isOpen: false,
  });

  const show = useCallback((params: ConfirmationAlertParams) => {
    setProps({
      title: params.title,
      description: params.description,
      isOpen: true,
      cancelText: params.cancelText,
      confirmText: params.confirmText,
      onCancel: params.onCancel,
      onConfirm: params.onConfirm,
    });
  }, []);

  const onOpenChange = (isOpen: boolean) => {
    setProps((props) => ({
      ...props,
      isOpen,
    }));
  };

  return (
    <ConfirmationAlertContext.Provider value={{ show }}>
      <ConfirmationAlert {...props} onOpenChange={onOpenChange} />
      {children}
    </ConfirmationAlertContext.Provider>
  );
};
