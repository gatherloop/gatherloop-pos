import { MutableRefObject, ReactNode, useEffect } from 'react';
import {
  DefaultValues,
  FieldValues,
  FormProvider,
  Resolver,
  useForm,
  UseFormReturn,
} from 'react-hook-form';
import { Form, FormProps as TamaguiFormProps } from 'tamagui';
import { match } from 'ts-pattern';
import { LoadingView } from '../LoadingView';
import { ErrorView } from '../ErrorView';

export type FormVariant =
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error'; onRetryButtonPress: () => void };

export type FormViewProps<T extends FieldValues> = {
  variant: FormVariant;
  defaultValues: T;
  resolver: Resolver<T>;
  onSubmit: (values: T) => void;
  loadingTitle: string;
  errorTitle: string;
  errorSubtitle?: string;
  children: (form: UseFormReturn<T>) => ReactNode;
  /**
   * Escape hatch for surfaces where a sibling controller must drive the form
   * imperatively. `current` is null until the loaded branch mounts — always
   * null-check. Do not use this to read values for rendering; use FieldWatch.
   */
  formRef?: MutableRefObject<UseFormReturn<T> | null>;
  /**
   * Passthrough for the underlying Tamagui `<Form>` (e.g. `flex`, `gap`) for
   * surfaces whose layout depends on more than the default `gap="$3"`.
   */
  formProps?: Omit<TamaguiFormProps, 'onSubmit' | 'children'>;
};

export function FormView<T extends FieldValues>(props: FormViewProps<T>) {
  return match(props.variant)
    .with({ type: 'loading' }, () => (
      <LoadingView title={props.loadingTitle} />
    ))
    .with({ type: 'error' }, ({ onRetryButtonPress }) => (
      <ErrorView
        title={props.errorTitle}
        subtitle={
          props.errorSubtitle ?? 'Please click the retry button to refetch data'
        }
        onRetryButtonPress={onRetryButtonPress}
      />
    ))
    .with({ type: 'loaded' }, () => (
      <LoadedForm
        defaultValues={props.defaultValues}
        resolver={props.resolver}
        onSubmit={props.onSubmit}
        formRef={props.formRef}
        formProps={props.formProps}
      >
        {props.children}
      </LoadedForm>
    ))
    .exhaustive();
}

type LoadedFormProps<T extends FieldValues> = Pick<
  FormViewProps<T>,
  'defaultValues' | 'resolver' | 'onSubmit' | 'children' | 'formRef' | 'formProps'
>;

// A separate component, mounted only inside the `loaded` branch, so `useForm`
// sees final `defaultValues` on its first render instead of the empty shape
// the surrounding usecase starts with.
function LoadedForm<T extends FieldValues>({
  defaultValues,
  resolver,
  onSubmit,
  formRef,
  formProps,
  children,
}: LoadedFormProps<T>) {
  const form = useForm<T>({
    defaultValues: defaultValues as DefaultValues<T>,
    resolver,
  });

  useEffect(() => {
    if (!formRef) return;
    formRef.current = form;
    return () => {
      formRef.current = null;
    };
  }, [formRef, form]);

  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3" {...formProps}>
        {children(form)}
      </Form>
    </FormProvider>
  );
}
