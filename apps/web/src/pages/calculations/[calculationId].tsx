import {
  CalculationUpdateScreen,
  CalculationUpdateScreenProps,
  getCalculationUpdateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & CalculationUpdateScreenProps,
  { calculationId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const calculationId = parseInt(ctx.params?.calculationId ?? '');
  const dehydratedState = await getCalculationUpdateScreenDehydratedState(
    ctx,
    calculationId
  );
  return {
    props: { dehydratedState, calculationId },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default CalculationUpdateScreen;
