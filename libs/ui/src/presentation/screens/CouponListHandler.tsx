import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Coupon,
  CouponDeleteUsecase,
  CouponListUsecase,
} from '../../domain';
import { CouponListScreen, CouponListScreenProps } from './CouponListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCouponDeleteController,
  useCouponListController,
} from '../controllers';

export type CouponListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  couponListUsecase: CouponListUsecase;
  couponDeleteUsecase: CouponDeleteUsecase;
};

export const CouponListHandler = ({
  authLogoutUsecase,
  couponListUsecase,
  couponDeleteUsecase,
}: CouponListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const couponList = useCouponListController(couponListUsecase);
  const couponDelete = useCouponDeleteController(couponDeleteUsecase);
  const router = useRouter();

  useEffect(() => {
    match(couponDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        couponList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [couponDelete.state, couponList]);

  return (
    <CouponListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(coupon: Coupon) => router.push(`/coupons/${coupon.id}`)}
      onItemPress={(coupon: Coupon) => router.push(`/coupons/${coupon.id}`)}
      onDeleteMenuPress={(coupon: Coupon) =>
        couponDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          couponId: coupon.id,
        })
      }
      onRetryButtonPress={() => couponList.dispatch({ type: 'FETCH' })}
      isRevalidating={couponList.state.type === 'revalidating'}
      variant={match(couponList.state)
        .returnType<CouponListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: P.union('loaded', 'revalidating') }, ({ coupons }) => ({
          type: coupons.length > 0 ? 'loaded' : 'empty',
          coupons,
        }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      isDeleteModalOpen={match(couponDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={couponDelete.state.type === 'deleting'}
      onDeleteCancel={() =>
        couponDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => couponDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
