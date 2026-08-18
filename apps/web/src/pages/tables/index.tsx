import {
  ApiTableRepository,
  TableList,
  TableListProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<TableListProps> = async (
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
  const tableRepository = new ApiTableRepository(client);
  const tables = await tableRepository.fetchTableList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { tableListParams: { tables } },
  };
};

export default TableList;
