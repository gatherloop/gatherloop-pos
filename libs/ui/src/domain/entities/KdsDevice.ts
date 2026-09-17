import { z } from 'zod';

export type KdsPlatform = 'ios' | 'android';

export type KdsDevice = {
  id: number;
  name: string;
  pushToken: string;
  platform: KdsPlatform;
  lastSeenAt?: string;
  createdAt: string;
  deletedAt?: string;
};

export type KdsDeviceForm = {
  name: string;
};

export const kdsDeviceFormSchema = z.object({
  name: z.string().min(1),
}) satisfies z.ZodType<KdsDeviceForm>;
