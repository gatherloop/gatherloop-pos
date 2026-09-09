import { Input, InputProps } from 'tamagui';
import { useFieldContext } from './Field';
import { Controller } from 'react-hook-form';
import { forwardRef } from 'react';

export type InputTextProps = {
  name?: string;
} & InputProps;

export const InputText = forwardRef<Input, InputTextProps>(
  ({ name, ...inputProps }: InputTextProps, ref) => {
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
            ref={ref}
          />
        )}
      />
    );
  }
);
