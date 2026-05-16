import { Field, FormErrorBanner, InputText } from '../base';
import { SupplierForm } from '../../../domain';
import { Controller, FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form, Label, Separator, SizableText, Spinner, Switch, XStack } from 'tamagui';

export type SupplierFormViewProps = {
  form: UseFormReturn<SupplierForm>;
  onSubmit: (values: SupplierForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const SupplierFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
}: SupplierFormViewProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="phone" label="Phone">
          <InputText />
        </Field>
        <Field name="address" label="Address">
          <InputText />
        </Field>
        <Field name="mapsLink" label="Maps Link">
          <InputText />
        </Field>

        <Separator />

        <Controller
          control={form.control}
          name="isOnline"
          render={({ field: { value, onChange } }) => (
            <XStack alignItems="center" gap="$3">
              <Switch
                id="is-online-switch"
                checked={value}
                onCheckedChange={onChange}
                theme={value ? 'blue' : undefined}
              >
                <Switch.Thumb animation="quick" />
              </Switch>
              <Label htmlFor="is-online-switch">
                <SizableText>
                  {value ? 'Online Store' : 'Offline Store'}
                </SizableText>
              </Label>
            </XStack>
          )}
        />

        <Button
          disabled={isSubmitDisabled}
          onPress={form.handleSubmit(onSubmit)}
          theme="blue"
          icon={isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  );
};
