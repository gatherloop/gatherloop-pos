import { ScrollView } from 'tamagui';
import { Layout, CouponFormView } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCouponCreateController,
} from '../controllers';
import { AuthLogoutUsecase, CouponCreateUsecase } from '../../domain';

export type CouponCreateScreenProps = {
  couponCreateUsecase: CouponCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const CouponCreateScreen = (props: CouponCreateScreenProps) => {
  const couponCreateController = useCouponCreateController(
    props.couponCreateUsecase
  );
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const router = useRouter();

  useEffect(() => {
    if (couponCreateController.state.type === 'submitSuccess')
      router.push('/coupons');
  }, [couponCreateController.state.type, router]);

  return (
    <Layout title="Create Coupon" showBackButton {...authLogoutController}>
      <ScrollView>
        <CouponFormView
          {...couponCreateController}
          variant={{ type: 'loaded' }}
        />
      </ScrollView>
    </Layout>
  );
};
