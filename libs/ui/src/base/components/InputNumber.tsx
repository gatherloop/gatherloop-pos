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
    if (!isNaN(numberValue)) {
      helpers.setValue(numberValue);
      helpers.setTouched(true);
    }
  };

  return (
    <Input
      value={field.value}
      onBlur={field.onBlur}
      id={fieldName}
      onChangeText={onChangeText}
    />
  );
};
