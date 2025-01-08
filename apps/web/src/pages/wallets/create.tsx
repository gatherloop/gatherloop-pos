import { WalletCreateScreen } from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  return {
    props: { dehydratedState: { mutations: [], queries: [] } },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default WalletCreateScreen;
