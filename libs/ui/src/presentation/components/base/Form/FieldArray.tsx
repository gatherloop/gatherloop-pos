import React from 'react';
import {
  Control,
  FieldArrayPath,
  FieldValues,
  useFieldArray,
  UseFieldArrayReturn,
} from 'react-hook-form';

export type FieldArrayProps<
  TFieldValues extends FieldValues = FieldValues,
  TFieldName extends FieldArrayPath<TFieldValues> = FieldArrayPath<TFieldValues>
> = {
  name: TFieldName;
  control: Control<TFieldValues>;
  children: (
    fieldArray: UseFieldArrayReturn<TFieldValues, TFieldName>
  ) => React.ReactNode;
};

export function FieldArray<
  TFieldValues extends FieldValues,
  TFieldName extends FieldArrayPath<TFieldValues>
>(props: FieldArrayProps<TFieldValues, TFieldName>) {
  const fieldArray = useFieldArray<TFieldValues, TFieldName>({
    name: props.name,
  });
  return <>{props.children(fieldArray)}</>;
}
