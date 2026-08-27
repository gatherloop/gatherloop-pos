import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Spinner } from 'tamagui';
import {
  Field,
  FormErrorBanner,
  InputText,
  InputNumber,
  Select,
  FormView,
  FormVariant,
} from '../base';
import { CouponForm, couponFormSchema } from '../../../domain';

const couponFormResolver = zodResolver(couponFormSchema);

export type CouponFormViewProps = {
  variant: FormVariant;
  defaultValues: CouponForm;
  onSubmit: (values: CouponForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const CouponFormView = (props: CouponFormViewProps) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={couponFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Coupon..."
    errorTitle="Failed to Fetch Coupon"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
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
          disabled={props.isSubmitDisabled}
          onPress={form.handleSubmit(props.onSubmit)}
          theme="blue"
          icon={props.isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </>
    )}
  </FormView>
);
