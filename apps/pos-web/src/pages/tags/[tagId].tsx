import { ApiTagRepository } from '@gatherloop-pos/ui';
import {
  TagUpdate,
  TagUpdateProps,
} from '@gatherloop-pos/ui/pos';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TagUpdateProps,
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

  const client = new QueryClient();
  const tagRepository = new ApiTagRepository(client);
  const tagId = parseInt(ctx.params?.tagId ?? '');
  const tag = await tagRepository.fetchTagById(tagId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { tagUpdateParams: { tag, tagId } },
  };
};

export default TagUpdate;
