import {
  MaterialListScreen,
  getMaterialListScreenDehydratedState,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { PageProps } from '../_app';

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  _ctx
) => {
  const dehydratedState = await getMaterialListScreenDehydratedState();
  return { props: { dehydratedState } };
};

export default MaterialListScreen;
