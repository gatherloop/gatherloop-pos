import { ApiAuthRepository, ApiTicketRepository } from '../data';
import {
  TicketListUsecase,
  TicketDeleteUsecase,
  AuthLogoutUsecase,
  TicketListParams,
} from '../domain';
import { TicketListHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TicketListProps = {
  ticketListParams: TicketListParams;
};

export function TicketList({ ticketListParams }: TicketListProps) {
  const client = new QueryClient();
  const ticketRepository = new ApiTicketRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const ticketDeleteUsecase = new TicketDeleteUsecase(ticketRepository);
  const ticketListUsecase = new TicketListUsecase(
    ticketRepository,
    ticketListParams
  );

  return (
    <TicketListHandler
      authLogoutUsecase={authLogoutUsecase}
      ticketListUsecase={ticketListUsecase}
      ticketDeleteUsecase={ticketDeleteUsecase}
    />
  );
}
