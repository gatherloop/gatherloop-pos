import {
  MaterialUpdateScreen,
  MaterialUpdateScreenProps,
  getMaterialUpdateScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<
  PageProps & MaterialUpdateScreenProps,
  { materialId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  const materialId = parseInt(ctx.params?.materialId ?? '');
  const dehydratedState = await getMaterialUpdateScreenDehydratedState(
    ctx,
    materialId
  );
  return {
    props: { dehydratedState, materialId },
    redirect: isLoggedIn ? undefined : { destination: '/auth/login' },
  };
};

export default MaterialUpdateScreen;
