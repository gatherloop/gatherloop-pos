import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  couponCreate,
  couponDeleteById,
  couponFindById,
  couponFindByIdQueryKey,
  couponList,
  couponListQueryKey,
  couponUpdateById,
} from '../../../../api-contract/src';
import { Coupon, CouponRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiCoupon, toCoupon } from './coupon.transformer';

export class ApiCouponRepository implements CouponRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchCouponById = (couponId: number, options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: couponFindByIdQueryKey(couponId),
        queryFn: () => couponFindById(couponId, options),
      })
      .then(({ data }) => toCoupon(data));
  };

  createCoupon: CouponRepository['createCoupon'] = (formValues) => {
    return couponCreate(toApiCoupon(formValues)).then();
  };

  updateCoupon: CouponRepository['updateCoupon'] = (formValues, couponId) => {
    return couponUpdateById(couponId, toApiCoupon(formValues)).then();
  };

  deleteCouponById: CouponRepository['deleteCouponById'] = (couponId) => {
    return couponDeleteById(couponId).then();
  };

  fetchCouponList = (options?: Partial<RequestConfig>): Promise<Coupon[]> => {
    return this.client
      .fetchQuery({
        queryKey: couponListQueryKey(),
        queryFn: () => couponList(options),
      })
      .then((data) => data.data.map(toCoupon));
  };
}
