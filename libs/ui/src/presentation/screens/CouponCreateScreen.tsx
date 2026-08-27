import { ScrollView } from 'tamagui';
import {
  CouponFormView,
  CouponFormViewProps,
  Layout,
} from '../components';
import { CouponForm } from '../../domain';

export type CouponCreateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: CouponForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CouponForm) => void;
  variant: CouponFormViewProps['variant'];
  serverError?: string;
};

export const CouponCreateScreen = ({
  defaultValues,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
}: CouponCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Coupon"
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
