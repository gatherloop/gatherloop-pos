import { useField as useFormikField } from 'formik';
import { Input as TamaguiInput } from 'tamagui';
import { useFieldContext } from './Field';

export type InputProps = {
  name?: string;
};

export const Input = (props: InputProps) => {
  const { name } = useFieldContext();
  const fieldName = name ?? props.name ?? '';
  const [field, _meta, helpers] = useFormikField(fieldName);
  return (
    <TamaguiInput {...field} id={fieldName} onChangeText={helpers.setValue} />
  );
};
