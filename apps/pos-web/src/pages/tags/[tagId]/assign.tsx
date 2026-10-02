import {
  TagAssignment,
  TagAssignmentProps,
} from '@gatherloop-pos/ui/pos';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  TagAssignmentProps,
  { tagId: string }
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

  const tagId = parseInt(ctx.params?.tagId ?? '');

  return {
    props: { tagAssignmentParams: { tagId } },
  };
};

export default TagAssignment;
