import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CouponUpdateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  CouponUpdateScreen,
  CouponUpdateScreenProps,
} from '../../views/screens/pos/CouponUpdateScreen';

export type CouponUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  couponUpdateUsecase: CouponUpdateUsecase;
};

export const CouponUpdateHandler = ({
  authLogoutUsecase,
  couponUpdateUsecase,
}: CouponUpdateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const couponUpdate = useUsecase(couponUpdateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (couponUpdate.state.type === 'submitSuccess') {
      toast.show('Update Coupon Success');
      router.push('/coupons');
    } else if (couponUpdate.state.type === 'submitError') {
      toast.show('Update Coupon Error');
    }
  }, [couponUpdate.state.type, toast, router]);

  return (
    <CouponUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={couponUpdate.state.values}
      isSubmitDisabled={
        couponUpdate.state.type === 'submitting' ||
        couponUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={couponUpdate.state.type === 'submitting'}
      serverError={
        couponUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) =>
        couponUpdate.dispatch({ type: 'SUBMIT', values })
      }
      variant={match(couponUpdate.state)
        .returnType<CouponUpdateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitError',
              'submitSuccess',
              'submitting'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () => couponUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
