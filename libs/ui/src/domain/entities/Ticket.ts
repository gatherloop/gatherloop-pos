export type Ticket = {
  id: number;
  code: string;
  name: string;
  createdAt: string;
};

export type TicketForm = {
  code: string;
  name: string;
};
