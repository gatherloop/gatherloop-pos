import React from 'react';
import {
  Control,
  FieldPath,
  FieldPathValues,
  FieldValues,
  useWatch,
} from 'react-hook-form';

export type FieldWatchProps<
  TFieldValues extends FieldValues,
  TFieldNames extends FieldPath<TFieldValues>[]
> = {
  name: readonly [...TFieldNames];
  control: Control<TFieldValues>;
  children: (
    value: FieldPathValues<TFieldValues, TFieldNames>
  ) => React.ReactNode;
};

export function FieldWatch<
  TFieldValues extends FieldValues,
  TFieldNames extends FieldPath<TFieldValues>[]
>(props: FieldWatchProps<TFieldValues, TFieldNames>) {
  const value = useWatch({ name: props.name });
  return <>{props.children(value)}</>;
}
