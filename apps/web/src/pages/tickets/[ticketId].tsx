import {
  ApiTicketRepository,
  TicketUpdate,
  TicketUpdateProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TicketUpdateProps,
  { ticketId: string }
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
  const ticketRepository = new ApiTicketRepository(client);
  const ticketId = parseInt(ctx.params?.ticketId ?? '');
  const ticket = await ticketRepository.fetchTicketById(ticketId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: { ticketUpdateParams: { ticket, ticketId } },
  };
};

export default TicketUpdate;
