import {
  MaterialListScreen,
  getMaterialListScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const dehydratedState = await getMaterialListScreenDehydratedState(ctx);
  return {
    props: { dehydratedState },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default MaterialListScreen;
