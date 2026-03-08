import { ApiAuthRepository, ApiCouponRepository } from '../data';
import {
  AuthLogoutUsecase,
  CouponUpdateParams,
  CouponUpdateUsecase,
} from '../domain';
import { CouponUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CouponUpdateProps = {
  couponUpdateParams: CouponUpdateParams;
};

export function CouponUpdate({ couponUpdateParams }: CouponUpdateProps) {
  const client = new QueryClient();
  const couponRepository = new ApiCouponRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const couponUpdateUsecase = new CouponUpdateUsecase(
    couponRepository,
    couponUpdateParams
  );

  return (
    <CouponUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      couponUpdateUsecase={couponUpdateUsecase}
    />
  );
}
