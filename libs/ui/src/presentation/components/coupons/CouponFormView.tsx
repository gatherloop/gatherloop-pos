import {
  Field,
  InputText,
  LoadingView,
  ErrorView,
  InputNumber,
  Select,
} from '../base';
import { CouponForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Button, Form } from 'tamagui';

export type CouponFormViewProps = {
  variant:
    | { type: 'loaded' }
    | { type: 'loading' }
    | { type: 'error'; onRetryButtonPress: () => void };
  form: UseFormReturn<CouponForm>;
  onSubmit: (values: CouponForm) => void;
  isSubmitDisabled: boolean;
};

export const CouponFormView = ({
  variant,
  form,
  onSubmit,
  isSubmitDisabled,
}: CouponFormViewProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Field name="code" label="Code">
          <InputText />
        </Field>
        <Field name="type" label="Type">
          <Select
            items={[
              { label: 'Fixed', value: 'fixed' },
              { label: 'Percentage', value: 'percentage' },
            ]}
          />
        </Field>
        <Field name="amount" label="Amount">
          <InputNumber />
        </Field>

        <Button
          disabled={isSubmitDisabled}
          onPress={form.handleSubmit(onSubmit)}
          theme="blue"
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  ) : variant.type === 'loading' ? (
    <LoadingView title="Fetching Coupon..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Coupon"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={variant.onRetryButtonPress}
    />
  ) : null;
};
