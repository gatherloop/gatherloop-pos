import { Input, InputProps } from 'tamagui';
import { useFieldContext } from './Field';
import { Controller } from 'react-hook-form';

export type InputTextProps = {
  name?: string;
} & InputProps;

export const InputText = ({ name, ...inputProps }: InputTextProps) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';

  return (
    <Controller
      name={fieldName}
      render={({ field }) => (
        <Input
          id={field.name}
          {...inputProps}
          {...field}
          onChangeText={field.onChange}
        />
      )}
    />
  );
};
