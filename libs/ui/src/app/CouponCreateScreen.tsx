import { ApiAuthRepository, ApiCouponRepository } from '../data';
import { AuthLogoutUsecase, CouponCreateUsecase } from '../domain';
import { CouponCreateScreen as CouponCreateScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function CouponCreateScreen() {
  const client = new QueryClient();
  const couponRepository = new ApiCouponRepository(client);
  const authRepository = new ApiAuthRepository();

  const couponCreateUsecase = new CouponCreateUsecase(couponRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CouponCreateScreenView
      couponCreateUsecase={couponCreateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
