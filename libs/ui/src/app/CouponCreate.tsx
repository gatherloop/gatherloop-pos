import { ApiAuthRepository, ApiCouponRepository } from '../data';
import { AuthLogoutUsecase, CouponCreateUsecase } from '../domain';
import { CouponCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function CouponCreate() {
  const client = new QueryClient();
  const couponRepository = new ApiCouponRepository(client);
  const authRepository = new ApiAuthRepository();

  const couponCreateUsecase = new CouponCreateUsecase(couponRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CouponCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      couponCreateUsecase={couponCreateUsecase}
    />
  );
}
