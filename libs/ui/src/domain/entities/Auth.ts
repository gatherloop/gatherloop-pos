import { z } from 'zod';

export type AuthLoginForm = {
  username: string;
  password: string;
};

export const authLoginFormSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
}) satisfies z.ZodType<AuthLoginForm>;
