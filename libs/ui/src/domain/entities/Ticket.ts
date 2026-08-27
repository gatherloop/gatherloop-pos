import { z } from 'zod';

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

export const ticketFormSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
}) satisfies z.ZodType<TicketForm>;
