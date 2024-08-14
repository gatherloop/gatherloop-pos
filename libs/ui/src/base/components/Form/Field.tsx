import { useField } from 'formik';
import { ReactNode, createContext, useContext } from 'react';
import { Label, Paragraph, YStack, YStackProps } from 'tamagui';

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
  const [_field, meta] = useField(name);
  return (
    <Context.Provider value={{ name }}>
      <YStack gap="$3" {...yStackProps}>
        <Label htmlFor={name}>{label}</Label>
        {children}
        {meta.touched && meta.error && (
          <Paragraph color="$red10">{meta.error}</Paragraph>
        )}
      </YStack>
    </Context.Provider>
  );
};
