import {
  ApiTicketRepository,
  TicketList,
  TicketListProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<TicketListProps> = async (
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
  const ticketRepository = new ApiTicketRepository(client);
  const tickets = await ticketRepository.fetchTicketList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { ticketListParams: { tickets } },
  };
};

export default TicketList;
