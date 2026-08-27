import { ComponentProps, MutableRefObject, ReactNode, useEffect } from 'react';
import {
  DefaultValues,
  FieldValues,
  FormProvider,
  Resolver,
  UseFormReturn,
  useForm,
} from 'react-hook-form';
import { match } from 'ts-pattern';
import { Form } from 'tamagui';
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
  // Escape hatch for form views whose layout can't use the default
  // `gap="$3"` container (e.g. a bounded scroll region needs `flex={1}`
  // instead). Spread onto the inner `<Form>` after the default, so any key
  // here overrides it.
  formProps?: Omit<ComponentProps<typeof Form>, 'onSubmit' | 'children'>;
  /**
   * Escape hatch for surfaces where a sibling controller must drive the form
   * imperatively (see TRD §4.6). `current` is null until the loaded branch
   * mounts — always null-check. Do not use this to read values for
   * rendering; use `FieldWatch`. Do not use it to read submitted values
   * either; read them off the usecase's `state.values` instead.
   */
  formRef?: MutableRefObject<UseFormReturn<T> | null>;
  children: (form: UseFormReturn<T>) => ReactNode;
};

export function FormView<T extends FieldValues>(props: FormViewProps<T>) {
  return match(props.variant)
    .with({ type: 'loading' }, () => <LoadingView title={props.loadingTitle} />)
    .with({ type: 'error' }, ({ onRetryButtonPress }) => (
      <ErrorView
        title={props.errorTitle}
        subtitle={props.errorSubtitle ?? 'Please click the retry button to refetch data'}
        onRetryButtonPress={onRetryButtonPress}
      />
    ))
    .with({ type: 'loaded' }, () => (
      <LoadedForm
        defaultValues={props.defaultValues}
        resolver={props.resolver}
        onSubmit={props.onSubmit}
        formProps={props.formProps}
        formRef={props.formRef}
      >
        {props.children}
      </LoadedForm>
    ))
    .exhaustive();
}

// A separate component so `useForm` only mounts once `defaultValues` are final:
// the `loading` branch above never calls this hook, so the eventual mount into
// the `loaded` branch reads the fetched values, not the pre-fetch blanks.
function LoadedForm<T extends FieldValues>({
  defaultValues,
  resolver,
  onSubmit,
  children,
  formProps,
  formRef,
}: Pick<
  FormViewProps<T>,
  'defaultValues' | 'resolver' | 'onSubmit' | 'children' | 'formProps' | 'formRef'
>) {
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
