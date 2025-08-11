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
  Coupon as ApiCoupon,
} from '../../../../api-contract/src';
import { Coupon, CouponRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';

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
      .then(({ data }) => transformers.coupon(data));
  };

  createCoupon: CouponRepository['createCoupon'] = (formValues) => {
    return couponCreate(formValues).then();
  };

  updateCoupon: CouponRepository['updateCoupon'] = (formValues, couponId) => {
    return couponUpdateById(couponId, formValues).then();
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
      .then((data) => data.data.map(transformers.coupon));
  };
}

const transformers = {
  coupon: (coupon: ApiCoupon): Coupon => ({
    id: coupon.id,
    amount: coupon.amount,
    code: coupon.code,
    type: coupon.type,
    createdAt: coupon.createdAt,
  }),
};
