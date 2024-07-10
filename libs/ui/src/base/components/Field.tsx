import { useField } from 'formik';
import { ReactNode, createContext, useContext } from 'react';
import { Label, Paragraph, YStack } from 'tamagui';

type FieldContextValue = { name?: string };

const Context = createContext<FieldContextValue>({});

export const useFieldContext = () => useContext(Context);

export type FieldProps = {
  name: string;
  label: string;
  children: ReactNode;
};

export const Field = (props: FieldProps) => {
  const [_field, meta] = useField(props.name);
  return (
    <Context.Provider value={{ name: props.name }}>
      <YStack gap="$3">
        <Label htmlFor={props.name}>{props.label}</Label>
        {props.children}
        {meta.touched && meta.error && (
          <Paragraph color="$red10">{meta.error}</Paragraph>
        )}
      </YStack>
    </Context.Provider>
  );
};
