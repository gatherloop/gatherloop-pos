import { ApiAuthRepository, ApiTicketRepository } from '../data';
import {
  AuthLogoutUsecase,
  TicketUpdateParams,
  TicketUpdateUsecase,
} from '../domain';
import { TicketUpdateHandler } from '../presentation';
import { QueryClient } from '@tanstack/react-query';

export type TicketUpdateProps = {
  ticketUpdateParams: TicketUpdateParams;
};

export function TicketUpdate({ ticketUpdateParams }: TicketUpdateProps) {
  const client = new QueryClient();
  const ticketRepository = new ApiTicketRepository(client);
  const authRepository = new ApiAuthRepository();

  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);
  const ticketUpdateUsecase = new TicketUpdateUsecase(
    ticketRepository,
    ticketUpdateParams
  );

  return (
    <TicketUpdateHandler
      authLogoutUsecase={authLogoutUsecase}
      ticketUpdateUsecase={ticketUpdateUsecase}
    />
  );
}
