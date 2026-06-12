import { Ticket, TicketForm } from '../../domain/entities';
import { TicketRepository } from '../../domain/repositories/ticket';

export class MockTicketRepository implements TicketRepository {
  tickets: Ticket[] = [
    {
      id: 1,
      code: '0xA3F19C82',
      name: 'Ticket 01',
      createdAt: '2024-03-20T00:00:00.000Z',
    },
    {
      id: 2,
      code: '0xB7E2D451',
      name: 'Ticket 02',
      createdAt: '2024-03-21T00:00:00.000Z',
    },
  ];

  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchTicketList(): Promise<Ticket[]> {
    if (this.shouldFail) throw new Error('Failed to fetch tickets');
    return [...this.tickets];
  }

  async fetchTicketById(ticketId: number): Promise<Ticket> {
    if (this.shouldFail) throw new Error('Failed to fetch ticket');
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    return { ...ticket };
  }

  async deleteTicketById(ticketId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete ticket');
    this.tickets = this.tickets.filter((t) => t.id !== ticketId);
  }

  async createTicket(formValues: TicketForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create ticket');
    this.tickets.push({
      id: this.nextId++,
      code: formValues.code,
      name: formValues.name,
      createdAt: new Date().toISOString(),
    });
  }

  async updateTicket(formValues: TicketForm, ticketId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update ticket');
    const idx = this.tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) throw new Error('Ticket not found');
    this.tickets[idx] = {
      ...this.tickets[idx],
      code: formValues.code,
      name: formValues.name,
    };
  }

  reset() {
    this.tickets = [
      {
        id: 1,
        code: '0xA3F19C82',
        name: 'Ticket 01',
        createdAt: '2024-03-20T00:00:00.000Z',
      },
      {
        id: 2,
        code: '0xB7E2D451',
        name: 'Ticket 02',
        createdAt: '2024-03-21T00:00:00.000Z',
      },
    ];
    this.nextId = 3;
    this.shouldFail = false;
  }
}
