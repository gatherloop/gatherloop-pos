import { ApiAuthRepository, ApiCouponRepository } from '../data';
import {
  CouponListUsecase,
  CouponDeleteUsecase,
  AuthLogoutUsecase,
  CouponListParams,
} from '../domain';
import { CouponListScreen as CouponListScreenView } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type CouponListScreenProps = {
  couponListParams: CouponListParams;
};

export function CouponListScreen({ couponListParams }: CouponListScreenProps) {
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
    <CouponListScreenView
      couponDeleteUsecase={couponDeleteUsecase}
      couponListUsecase={couponListUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
