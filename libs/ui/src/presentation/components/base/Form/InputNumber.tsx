import { Button, Input, InputProps, XStack } from 'tamagui';
import { useFieldContext } from './Field';
import { Controller } from 'react-hook-form';
import { Minus, Plus } from '@tamagui/lucide-icons';

export type InputNumberProps = {
  name?: string;
  min?: number;
  max?: number;
  fractionDigit?: number;
  step?: number;
} & InputProps;

export const InputNumber = ({
  name,
  min,
  max,
  fractionDigit = 0,
  step = 1,
  ...inputProps
}: InputNumberProps) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';
  return (
    <Controller
      name={fieldName}
      render={({ field }) => {
        const isEmpty =
          field.value === null ||
          field.value === undefined ||
          (typeof field.value === 'number' && Number.isNaN(field.value));
        return (
          <XStack gap="$2" alignItems="center">
            {step > 0 && (
              <Button
                icon={Minus}
                variant="outlined"
                size="$2"
                onPress={() => {
                  if (isEmpty) return;
                  if (typeof min === 'undefined' || field.value > min) {
                    const newValue = field.value - step;
                    field.onChange(newValue);
                  }
                }}
                circular
                disabled={inputProps.disabled}
              />
            )}

            <Input
              {...inputProps}
              id={fieldName}
              onChangeText={(text: string) => {
                const numberValue =
                  text.trim() === '' ? min ?? 0 : parseFloat(text);
                if (
                  !isNaN(numberValue) &&
                  (typeof min === 'undefined' || numberValue >= min) &&
                  (typeof max === 'undefined' || numberValue <= max)
                ) {
                  field.onChange(numberValue);
                }
              }}
              value={
                isEmpty ? '' : parseFloat(field.value).toFixed(fractionDigit)
              }
              onBlur={field.onBlur}
              flex={1}
            />

            {step > 0 && (
              <Button
                icon={Plus}
                variant="outlined"
                size="$2"
                onPress={() => {
                  if (isEmpty) {
                    field.onChange(min ?? 0);
                    return;
                  }
                  if (typeof max === 'undefined' || field.value < max) {
                    const newValue = field.value + step;
                    field.onChange(newValue);
                  }
                }}
                circular
                disabled={inputProps.disabled}
              />
            )}
          </XStack>
        );
      }}
    />
  );
};
