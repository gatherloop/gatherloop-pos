import { z } from 'zod';
import { Variant } from './Variant';
import { PublicTable } from './PublicTable';
import { PaymentMethod } from './Payment';

export type CartItem = {
  id: number;
  cartId: number;
  variantId: number;
  variant: Variant;
  amount: number;
  note: string;
  price: number;
  subtotal: number;
  createdAt: string;
};

export type CartStatus = 'active' | 'converted' | 'abandoned';

export type PendingPayment = {
  partnerReferenceNo: string;
  method: PaymentMethod;
  amount: number;
  expiredAt: string;
  canCancel: boolean;
};

export type Cart = {
  id: number;
  sessionId: string;
  tableId: number | null;
  table: PublicTable | null;
  status: CartStatus;
  items: CartItem[];
  itemCount: number;
  total: number;
  createdAt: string;
  pendingPayment: PendingPayment | null;
};

export type CartItemEditForm = {
  amount: number;
  note: string;
};

export const cartItemEditFormSchema = z.object({
  amount: z.number().int().min(1),
  note: z.string().max(255),
}) satisfies z.ZodType<CartItemEditForm>;
