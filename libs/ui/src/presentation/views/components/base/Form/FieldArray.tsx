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
  TFieldName extends FieldArrayPath<TFieldValues> = FieldArrayPath<TFieldValues>,
  TKeyName extends string = 'id'
> = {
  name: TFieldName;
  keyName: TKeyName;
  control: Control<TFieldValues>;
  children: (
    fieldArray: UseFieldArrayReturn<TFieldValues, TFieldName, TKeyName>
  ) => React.ReactNode;
};

export function FieldArray<
  TFieldValues extends FieldValues,
  TFieldName extends FieldArrayPath<TFieldValues>,
  TKeyName extends string = 'id'
>(props: FieldArrayProps<TFieldValues, TFieldName, TKeyName>) {
  const fieldArray = useFieldArray<TFieldValues, TFieldName, TKeyName>({
    name: props.name,
    keyName: props.keyName,
    control: props.control,
  });
  return <>{props.children(fieldArray)}</>;
}
