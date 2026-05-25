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
  allowNull?: boolean;
} & InputProps;

export const InputNumber = ({
  name,
  min,
  max,
  fractionDigit = 0,
  step = 1,
  allowNull = false,
  ...inputProps
}: InputNumberProps) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';
  return (
    <Controller
      name={fieldName}
      render={({ field }) => {
        const isNull = field.value === null;

        const displayValue = isNull
          ? ''
          : parseFloat(field.value).toFixed(fractionDigit);

        return (
          <XStack gap="$2" alignItems="center">
            {step > 0 && (
              <Button
                icon={Minus}
                variant="outlined"
                size="$2"
                onPress={() => {
                  if (isNull) return;
                  if (typeof min === 'undefined' || field.value > min) {
                    field.onChange(field.value - step);
                  }
                }}
                circular
                disabled={inputProps.disabled || isNull}
              />
            )}

            <Input
              {...inputProps}
              id={fieldName}
              placeholder={isNull ? '—' : inputProps.placeholder}
              onChangeText={(text: string) => {
                if (text.trim() === '') {
                  field.onChange(allowNull ? null : (min ?? 0));
                  return;
                }
                const numberValue = parseFloat(text);
                if (
                  !isNaN(numberValue) &&
                  (typeof min === 'undefined' || numberValue >= min) &&
                  (typeof max === 'undefined' || numberValue <= max)
                ) {
                  field.onChange(numberValue);
                }
              }}
              value={displayValue}
              onBlur={field.onBlur}
              flex={1}
            />

            {step > 0 && (
              <Button
                icon={Plus}
                variant="outlined"
                size="$2"
                onPress={() => {
                  if (isNull) {
                    field.onChange(typeof min !== 'undefined' && min > 0 ? min : 0);
                    return;
                  }
                  if (typeof max === 'undefined' || field.value < max) {
                    field.onChange(field.value + step);
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
