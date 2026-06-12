import { ApiAuthRepository, ApiTicketRepository } from '../data';
import { AuthLogoutUsecase, TicketCreateUsecase } from '../domain';
import { TicketCreateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export function TicketCreate() {
  const client = new QueryClient();
  const ticketRepository = new ApiTicketRepository(client);
  const authRepository = new ApiAuthRepository();

  const ticketCreateUsecase = new TicketCreateUsecase(ticketRepository);
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <TicketCreateHandler
      authLogoutUsecase={authLogoutUsecase}
      ticketCreateUsecase={ticketCreateUsecase}
    />
  );
}
