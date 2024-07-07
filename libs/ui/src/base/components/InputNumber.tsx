import { useField as useFormikField } from 'formik';
import { Input } from 'tamagui';
import { useFieldContext } from './Field';

export type InputNumberProps = {
  name?: string;
};

export const InputNumber = (props: InputNumberProps) => {
  const { name } = useFieldContext();
  const fieldName = name ?? props.name ?? '';
  const [field, _meta, helpers] = useFormikField(fieldName);

  const onChangeText = (text: string) => {
    const numberValue = parseInt(text);
    helpers.setValue(numberValue);
  };

  return <Input {...field} id={fieldName} onChangeText={onChangeText} />;
};
