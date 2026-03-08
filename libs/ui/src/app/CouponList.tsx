import { ApiAuthRepository, ApiCouponRepository } from '../data';
import {
  CouponListUsecase,
  CouponDeleteUsecase,
  AuthLogoutUsecase,
  CouponListParams,
} from '../domain';
import { CouponListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CouponListProps = {
  couponListParams: CouponListParams;
};

export function CouponList({ couponListParams }: CouponListProps) {
  const client = new QueryClient();
  const couponRepository = new ApiCouponRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const couponDeleteUsecase = new CouponDeleteUsecase(couponRepository);
  const couponListUsecase = new CouponListUsecase(
    couponRepository,
    couponListParams
  );

  return (
    <CouponListHandler
      authLogoutUsecase={authLogoutUsecase}
      couponListUsecase={couponListUsecase}
      couponDeleteUsecase={couponDeleteUsecase}
    />
  );
}
