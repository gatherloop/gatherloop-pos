import { ReactNode } from 'react';
import {
  DefaultValues,
  FieldValues,
  FormProvider,
  Resolver,
  UseFormReturn,
  useForm,
} from 'react-hook-form';
import { Form } from 'tamagui';
import { match } from 'ts-pattern';
import { ErrorView } from '../ErrorView';
import { LoadingView } from '../LoadingView';

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
      >
        {props.children}
      </LoadedForm>
    ))
    .exhaustive();
}

// A separate component (rather than an early return in FormView) so that
// useForm only mounts once `defaultValues` are final: React can unmount this
// subtree while loading, and the eventual mount reads the fetched values.
function LoadedForm<T extends FieldValues>({
  defaultValues,
  resolver,
  onSubmit,
  children,
}: Pick<FormViewProps<T>, 'defaultValues' | 'resolver' | 'onSubmit' | 'children'>) {
  const form = useForm<T>({
    defaultValues: defaultValues as DefaultValues<T>,
    resolver,
  });

  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        {children(form)}
      </Form>
    </FormProvider>
  );
}
