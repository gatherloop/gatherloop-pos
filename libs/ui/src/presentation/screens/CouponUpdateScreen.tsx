import { ScrollView } from 'tamagui';
import {
  CouponFormView,
  CouponFormViewProps,
  Layout,
} from '../components';
import { CouponForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type CouponUpdateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<CouponForm>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CouponForm) => void;
  variant: CouponFormViewProps['variant'];
  serverError?: string;
};

export const CouponUpdateScreen = ({
  form,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
}: CouponUpdateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Update Coupon"
      showBackButton
    >
      <ScrollView>
        <CouponFormView
          form={form}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          variant={variant}
          serverError={serverError}
        />
      </ScrollView>
    </Layout>
  );
};
