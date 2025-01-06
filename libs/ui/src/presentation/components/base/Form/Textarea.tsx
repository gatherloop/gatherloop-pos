import { TextAreaProps, TextArea } from 'tamagui';
import { useFieldContext } from './Field';
import { Controller } from 'react-hook-form';

export type TextareaProps = {
  name?: string;
} & TextAreaProps;

export const Textarea = ({ name, ...inputProps }: TextareaProps) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';
  return (
    <Controller
      name={fieldName}
      render={({ field }) => (
        <TextArea
          id={field.name}
          {...inputProps}
          {...field}
          onChangeText={field.onChange}
        />
      )}
    />
  );
};
