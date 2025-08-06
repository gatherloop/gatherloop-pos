import { ReactNode, createContext, useContext } from 'react';
import { Label, YStack, YStackProps } from 'tamagui';
import { ErrorMessage } from './ErrorMessage';

type FieldContextValue = { name?: string };

const Context = createContext<FieldContextValue>({});

export const useFieldContext = () => useContext(Context);

export type FieldProps = {
  name: string;
  label: string;
  children: ReactNode;
} & YStackProps;

export const Field = ({
  name,
  label,
  children,
  ...yStackProps
}: FieldProps) => {
  return (
    <Context.Provider value={{ name }}>
      <YStack gap="$3" {...yStackProps}>
        <Label htmlFor={name}>{label}</Label>
        {children}
        <ErrorMessage name={name} />
      </YStack>
    </Context.Provider>
  );
};
