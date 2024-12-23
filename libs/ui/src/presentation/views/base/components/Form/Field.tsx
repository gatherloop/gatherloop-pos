import { ReactNode, createContext, useContext } from 'react';
import { useFormContext } from 'react-hook-form';
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
  const { formState } = useFormContext();
  return (
    <Context.Provider value={{ name }}>
      <YStack gap="$3" {...yStackProps}>
        <Label htmlFor={name}>{label}</Label>
        {children}
        {formState.errors[name] && (
          <Paragraph color="$red10">
            {formState.errors[name]?.message}
          </Paragraph>
        )}
      </YStack>
    </Context.Provider>
  );
};
