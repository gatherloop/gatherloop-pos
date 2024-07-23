import { useField as useFormikField } from 'formik';
import { Button, Input, InputProps, XStack } from 'tamagui';
import { useFieldContext } from './Field';
import { Minus, Plus } from '@tamagui/lucide-icons';

export type InputNumberProps = {
  name?: string;
  min?: number;
  max?: number;
} & InputProps;

export const InputNumber = ({
  name,
  min,
  max,
  ...inputProps
}: InputNumberProps) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';
  const [field, _meta, helpers] = useFormikField(fieldName);

  const onChangeText = (text: string) => {
    const numberValue = text.trim() === '' ? min ?? 0 : parseInt(text);
    if (
      !isNaN(numberValue) &&
      (typeof min === 'undefined' || numberValue >= min) &&
      (typeof max === 'undefined' || numberValue <= max)
    ) {
      helpers.setValue(numberValue);
      helpers.setTouched(true);
    }
  };

  const onMinusButtonPress = () => {
    if (typeof min === 'undefined' || field.value > min) {
      const newValue = field.value - 1;
      helpers.setValue(newValue);
      helpers.setTouched(true);
    }
  };

  const onPlusButtonPress = () => {
    if (typeof max === 'undefined' || field.value < max) {
      const newValue = field.value + 1;
      helpers.setValue(newValue);
      helpers.setTouched(true);
    }
  };

  return (
    <XStack gap="$2" alignItems="center">
      <Button
        icon={Minus}
        variant="outlined"
        size="$2"
        onPress={onMinusButtonPress}
        circular
        disabled={inputProps.disabled}
      />
      <Input
        {...inputProps}
        id={fieldName}
        onChangeText={onChangeText}
        value={JSON.stringify(field.value)}
        flex={1}
      />
      <Button
        icon={Plus}
        variant="outlined"
        size="$2"
        onPress={onPlusButtonPress}
        circular
        disabled={inputProps.disabled}
      />
    </XStack>
  );
};
