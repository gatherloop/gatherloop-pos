import { Variant } from './Variant';
import { PublicTable } from './PublicTable';

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
};
