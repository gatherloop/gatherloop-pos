import { ScrollView } from 'tamagui';
import {
  CouponFormView,
  CouponFormViewProps,
  Layout,
} from '../components';
import { CouponForm } from '../../domain';

export type CouponUpdateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: CouponForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CouponForm) => void;
  variant: CouponFormViewProps['variant'];
  serverError?: string;
};

export const CouponUpdateScreen = ({
  defaultValues,
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
          defaultValues={defaultValues}
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
