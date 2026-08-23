import { Button, Input, InputProps, XStack } from 'tamagui';
import { useFieldContext } from './Field';
import {
  Controller,
  ControllerRenderProps,
  FieldValues,
} from 'react-hook-form';
import { Minus, Plus } from '@tamagui/lucide-icons';
import { forwardRef, Ref, useRef } from 'react';
import type {
  InputModeOptions,
  KeyboardTypeOptions,
  TextInput,
} from 'react-native';

export type InputNumberProps = {
  name?: string;
  min?: number;
  max?: number;
  fractionDigit?: number;
  step?: number;
  error?: boolean;
  // Stepper button size (Tamagui size token). Defaults to today's '$2' so
  // existing callers are unaffected; compact call sites pass '$3'.
  buttonSize?: string;
  // Explicit floor on the stepper buttons' touch target. A Tamagui `size`
  // token alone doesn't guarantee a given dp value, so compact call sites
  // pass 44 here to meet the WCAG 2.5.8 minimum.
  buttonMinSize?: number;
  // Defaults are derived from `fractionDigit` (whole numbers get a numeric
  // keypad, fractional values get a decimal one); pass either to override.
  inputMode?: InputModeOptions;
  keyboardType?: KeyboardTypeOptions;
} & Omit<InputProps, 'inputMode' | 'keyboardType'>;

type InputNumberFieldProps = {
  field: ControllerRenderProps<FieldValues, string>;
  fieldName: string;
  min?: number;
  max?: number;
  fractionDigit: number;
  step: number;
  inputProps: InputProps;
  error?: boolean;
  buttonSize: string;
  buttonMinSize?: number;
  inputMode: InputModeOptions;
  keyboardType: KeyboardTypeOptions;
  inputRef?: Ref<TextInput>;
};

const InputNumberField = ({
  field,
  fieldName,
  min,
  max,
  fractionDigit,
  step,
  inputProps,
  error,
  buttonSize,
  buttonMinSize,
  inputMode,
  keyboardType,
  inputRef,
}: InputNumberFieldProps) => {
  const isNullableRef = useRef(field.value === null);
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
          size={buttonSize}
          minWidth={buttonMinSize}
          minHeight={buttonMinSize}
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
        ref={inputRef}
        {...inputProps}
        id={fieldName}
        placeholder={isNull ? '—' : inputProps.placeholder}
        borderColor={error ? '$red8' : undefined}
        inputMode={inputMode}
        keyboardType={keyboardType}
        onChangeText={(text: string) => {
          if (text.trim() === '') {
            field.onChange(isNullableRef.current ? null : min ?? 0);
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
        // `flex={1}` lets the input grow to fill available space; a caller
        // that needs a floor under flex-shrink pressure should pass
        // `minWidth` (forwarded via `...inputProps` above), not just
        // `width` — `width` alone loses to `flex: 1` when the row is tight
        // (see docs/prd-stock-check-form-mobile.md FR-3).
        flex={1}
      />

      {step > 0 && (
        <Button
          icon={Plus}
          variant="outlined"
          size={buttonSize}
          minWidth={buttonMinSize}
          minHeight={buttonMinSize}
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
};

export const InputNumber = forwardRef<TextInput, InputNumberProps>(
  (
    {
      name,
      min,
      max,
      fractionDigit = 0,
      step = 1,
      error,
      buttonSize = '$2',
      buttonMinSize,
      inputMode,
      keyboardType,
      ...inputProps
    },
    ref
  ) => {
    const fieldContext = useFieldContext();
    const fieldName = fieldContext.name ?? name ?? '';
    const resolvedInputMode =
      inputMode ?? (fractionDigit === 0 ? 'numeric' : 'decimal');
    const resolvedKeyboardType =
      keyboardType ?? (fractionDigit === 0 ? 'number-pad' : 'decimal-pad');
    return (
      <Controller
        name={fieldName}
        render={({ field }) => (
          <InputNumberField
            field={field}
            fieldName={fieldName}
            min={min}
            max={max}
            fractionDigit={fractionDigit}
            step={step}
            inputProps={inputProps}
            error={error}
            buttonSize={buttonSize}
            buttonMinSize={buttonMinSize}
            inputMode={resolvedInputMode}
            keyboardType={resolvedKeyboardType}
            inputRef={ref}
          />
        )}
      />
    );
  }
);

InputNumber.displayName = 'InputNumber';
