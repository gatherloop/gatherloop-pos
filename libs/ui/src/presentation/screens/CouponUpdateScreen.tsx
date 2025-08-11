import { ScrollView } from 'tamagui';
import { Layout, CouponFormView } from '../components';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCouponUpdateController,
} from '../controllers';
import { AuthLogoutUsecase, CouponUpdateUsecase } from '../../domain';

export type CouponUpdateScreenProps = {
  couponUpdateUsecase: CouponUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const CouponUpdateScreen = (props: CouponUpdateScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const controller = useCouponUpdateController(props.couponUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (controller.state.type === 'submitSuccess') router.push('/coupons');
  }, [controller.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Coupon" showBackButton>
      <ScrollView>
        <CouponFormView {...controller} />
      </ScrollView>
    </Layout>
  );
};
