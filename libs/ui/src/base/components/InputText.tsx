import { useField as useFormikField } from 'formik';
import { Input } from 'tamagui';
import { useFieldContext } from './Field';

export type InputTextProps = {
  name?: string;
};

export const InputText = (props: InputTextProps) => {
  const { name } = useFieldContext();
  const fieldName = name ?? props.name ?? '';
  const [field, _meta, helpers] = useFormikField(fieldName);
  return <Input {...field} id={fieldName} onChangeText={helpers.setValue} />;
};
