import { ApiAuthRepository, ApiCouponRepository } from '../data';
import {
  AuthLogoutUsecase,
  CouponUpdateParams,
  CouponUpdateUsecase,
} from '../domain';
import { CouponUpdateScreen as CouponUpdateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CouponUpdateScreenProps = {
  couponUpdateParams: CouponUpdateParams;
};

export function CouponUpdateScreen({
  couponUpdateParams,
}: CouponUpdateScreenProps) {
  const client = new QueryClient();
  const couponRepository = new ApiCouponRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const couponUpdateUsecase = new CouponUpdateUsecase(
    couponRepository,
    couponUpdateParams
  );

  return (
    <CouponUpdateScreenView
      couponUpdateUsecase={couponUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
