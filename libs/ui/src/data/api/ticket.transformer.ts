// eslint-disable-next-line @nx/enforce-module-boundaries
import { Ticket as ApiTicket } from '../../../../api-contract/src';
import { Ticket, TicketForm } from '../../domain';

export function toTicket(ticket: ApiTicket): Ticket {
  return {
    id: ticket.id,
    code: ticket.code,
    name: ticket.name,
    createdAt: ticket.createdAt,
  };
}

export function toApiTicket(form: TicketForm) {
  return {
    code: form.code,
    name: form.name,
  };
}
