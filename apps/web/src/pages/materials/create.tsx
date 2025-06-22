import { MaterialCreateScreen } from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  return {
    props: {},
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default MaterialCreateScreen;
