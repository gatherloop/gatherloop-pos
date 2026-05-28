import { useEffect, useRef, useState } from 'react';
import { Input, InputProps } from 'tamagui';
import { createDebounce } from '../../../../utils';

export type DebouncedInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  delay?: number;
} & Omit<InputProps, 'value' | 'onChangeText'>;

export const DebouncedInput = ({
  value,
  onChangeText,
  delay = 400,
  ...inputProps
}: DebouncedInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef(createDebounce());
  const lastReportedRef = useRef(value);

  useEffect(() => {
    if (value !== lastReportedRef.current) {
      setLocalValue(value);
      lastReportedRef.current = value;
      debounceRef.current(() => {}, 0);
    }
  }, [value]);

  const handleChangeText = (text: string) => {
    setLocalValue(text);
    debounceRef.current(() => {
      lastReportedRef.current = text;
      onChangeText(text);
    }, delay);
  };

  return (
    <Input {...inputProps} value={localValue} onChangeText={handleChangeText} />
  );
};
