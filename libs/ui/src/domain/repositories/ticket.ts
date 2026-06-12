import { Ticket, TicketForm } from '../entities';

export interface TicketRepository {
  fetchTicketList: () => Promise<Ticket[]>;

  fetchTicketById: (ticketId: number) => Promise<Ticket>;

  deleteTicketById: (ticketId: number) => Promise<void>;

  createTicket: (formValues: TicketForm) => Promise<void>;

  updateTicket: (formValues: TicketForm, ticketId: number) => Promise<void>;
}
