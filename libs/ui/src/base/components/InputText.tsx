import { useField as useFormikField } from 'formik';
import { Input, InputProps } from 'tamagui';
import { useFieldContext } from './Field';

export type InputTextProps = {
  name?: string;
} & InputProps;

export const InputText = ({ name, ...inputProps }: InputTextProps) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';
  const [field, _meta, helpers] = useFormikField(fieldName);
  return (
    <Input
      {...field}
      id={fieldName}
      onChangeText={helpers.setValue}
      {...inputProps}
    />
  );
};
