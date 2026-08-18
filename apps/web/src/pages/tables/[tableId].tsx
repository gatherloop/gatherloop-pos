import {
  ApiTableRepository,
  TableUpdate,
  TableUpdateProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TableUpdateProps,
  { tableId: string }
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
  const tableRepository = new ApiTableRepository(client);
  const tableId = parseInt(ctx.params?.tableId ?? '');
  const table = await tableRepository.fetchTableById(tableId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { tableUpdateParams: { table, tableId } },
  };
};

export default TableUpdate;
