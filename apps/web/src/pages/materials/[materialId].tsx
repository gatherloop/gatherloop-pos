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
  const materialId = parseInt(ctx.params?.materialId ?? '');
  const dehydratedState = await getMaterialUpdateScreenDehydratedState(
    materialId
  );
  return { props: { dehydratedState, materialId } };
};

export default MaterialUpdateScreen;
