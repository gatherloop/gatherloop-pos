import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  ticketCreate,
  ticketDeleteById,
  ticketFindById,
  ticketFindByIdQueryKey,
  ticketList,
  ticketListQueryKey,
  ticketUpdateById,
} from '../../../../api-contract/src';
import { Ticket, TicketRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiTicket, toTicket } from './ticket.transformer';

export class ApiTicketRepository implements TicketRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchTicketById = (ticketId: number, options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: ticketFindByIdQueryKey(ticketId),
        queryFn: () => ticketFindById(ticketId, options),
      })
      .then(({ data }) => toTicket(data));
  };

  createTicket: TicketRepository['createTicket'] = (formValues) => {
    return ticketCreate(toApiTicket(formValues)).then();
  };

  updateTicket: TicketRepository['updateTicket'] = (formValues, ticketId) => {
    return ticketUpdateById(ticketId, toApiTicket(formValues)).then();
  };

  deleteTicketById: TicketRepository['deleteTicketById'] = (ticketId) => {
    return ticketDeleteById(ticketId).then();
  };

  fetchTicketList = (options?: Partial<RequestConfig>): Promise<Ticket[]> => {
    return this.client
      .fetchQuery({
        queryKey: ticketListQueryKey(),
        queryFn: () => ticketList(options),
      })
      .then((data) => data.data.map(toTicket));
  };
}
