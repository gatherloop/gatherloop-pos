import { ApiTagRepository } from '@gatherloop-pos/ui';
import {
  TagList,
  TagListProps,
} from '@gatherloop-pos/ui/pos';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<TagListProps> = async (
  ctx
) => {
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
  const tags = await tagRepository.fetchTagList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { tagListParams: { tags } },
  };
};

export default TagList;
