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

  const onChangeText = (text: string) => {
    helpers.setValue(text);
    helpers.setTouched(true);
  };

  return (
    <Input
      {...inputProps}
      id={fieldName}
      onChangeText={onChangeText}
      value={field.value}
    />
  );
};
