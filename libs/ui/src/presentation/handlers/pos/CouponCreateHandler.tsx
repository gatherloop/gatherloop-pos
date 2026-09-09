import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CouponCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  CouponCreateScreen,
  CouponCreateScreenProps,
} from '../../views/screens/pos/CouponCreateScreen';

export type CouponCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  couponCreateUsecase: CouponCreateUsecase;
};

export const CouponCreateHandler = ({
  authLogoutUsecase,
  couponCreateUsecase,
}: CouponCreateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const couponCreate = useUsecase(couponCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (couponCreate.state.type === 'submitSuccess') {
      toast.show('Create Coupon Success');
      router.push('/coupons');
    } else if (couponCreate.state.type === 'submitError') {
      toast.show('Create Coupon Error');
    }
  }, [couponCreate.state.type, toast, router]);

  return (
    <CouponCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={couponCreate.state.values}
      isSubmitDisabled={
        couponCreate.state.type === 'submitting' ||
        couponCreate.state.type === 'submitSuccess'
      }
      isSubmitting={couponCreate.state.type === 'submitting'}
      serverError={
        couponCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) =>
        couponCreate.dispatch({ type: 'SUBMIT', values })
      }
      variant={match(couponCreate.state)
        .returnType<CouponCreateScreenProps['variant']>()
        .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
        .with(
          {
            type: P.union('submitting', 'submitSuccess', 'submitError'),
          },
          () => ({
            type: 'loaded',
          })
        )
        .exhaustive()}
    />
  );
};
