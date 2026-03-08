import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CouponCreateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useCouponCreateController,
} from '../controllers';
import {
  CouponCreateScreen,
  CouponCreateScreenProps,
} from './CouponCreateScreen';

export type CouponCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  couponCreateUsecase: CouponCreateUsecase;
};

export const CouponCreateHandler = ({
  authLogoutUsecase,
  couponCreateUsecase,
}: CouponCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const couponCreate = useCouponCreateController(couponCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (couponCreate.state.type === 'submitSuccess')
      router.push('/coupons');
  }, [couponCreate.state.type, router]);

  return (
    <CouponCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={couponCreate.form}
      isSubmitDisabled={
        couponCreate.state.type === 'submitting' ||
        couponCreate.state.type === 'submitSuccess'
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
