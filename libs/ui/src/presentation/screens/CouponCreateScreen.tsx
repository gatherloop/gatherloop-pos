import { ScrollView } from 'tamagui';
import {
  CouponFormView,
  CouponFormViewProps,
  Layout,
} from '../components';
import { CouponForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type CouponCreateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<CouponForm>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CouponForm) => void;
  variant: CouponFormViewProps['variant'];
};

export const CouponCreateScreen = ({
  form,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
}: CouponCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Coupon"
      showBackButton
    >
      <ScrollView>
        <CouponFormView
          form={form}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          variant={variant}
        />
      </ScrollView>
    </Layout>
  );
};
