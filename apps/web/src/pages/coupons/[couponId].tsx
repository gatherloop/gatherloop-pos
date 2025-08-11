import {
  ApiCouponRepository,
  CouponUpdateScreen,
  CouponUpdateScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  CouponUpdateScreenProps,
  { couponId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const client = new QueryClient();
  const couponRepository = new ApiCouponRepository(client);
  const couponId = parseInt(ctx.params?.couponId ?? '');
  const coupon = await couponRepository.fetchCouponById(couponId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { couponUpdateParams: { coupon, couponId } },
  };
};

export default CouponUpdateScreen;
