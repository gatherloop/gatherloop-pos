import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { CouponDeleteAlert, CouponList, Layout } from '../components';
import {
  AuthLogoutUsecase,
  Coupon,
  CouponDeleteUsecase,
  CouponListUsecase,
} from '../../domain';
import {
  useAuthLogoutController,
  useCouponDeleteController,
  useCouponListController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

export type CouponListScreenProps = {
  couponListUsecase: CouponListUsecase;
  couponDeleteUsecase: CouponDeleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const CouponListScreen = (props: CouponListScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const couponListController = useCouponListController(props.couponListUsecase);
  const couponDeleteController = useCouponDeleteController(
    props.couponDeleteUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (couponDeleteController.state.type === 'deletingSuccess')
      couponListController.dispatch({ type: 'FETCH' });
  }, [couponDeleteController.state.type, couponListController]);

  const onEditMenuPress = (coupon: Coupon) => {
    router.push(`/coupons/${coupon.id}`);
  };

  const onItemPress = (coupon: Coupon) => {
    router.push(`/coupons/${coupon.id}`);
  };

  const onDeleteMenuPress = (coupon: Coupon) => {
    couponDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      couponId: coupon.id,
    });
  };

  return (
    <Layout
      {...authLogoutController}
      title="Coupons"
      rightActionItem={
        <Link href="/coupons/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <CouponList
        {...couponListController}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <CouponDeleteAlert {...couponDeleteController} />
    </Layout>
  );
};
