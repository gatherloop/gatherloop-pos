import { Cart } from '../entities';
import { RequestConfig } from '@kubb/swagger-client/client';

export interface CartRepository {
  fetchCurrentCart: (options?: Partial<RequestConfig>) => Promise<Cart>;

  updateTable: (
    tableCode: string,
    options?: Partial<RequestConfig>
  ) => Promise<Cart>;

  addItem: (
    params: {
      variantId: number;
      amount: number;
      note: string;
    },
    options?: Partial<RequestConfig>
  ) => Promise<Cart>;

  updateItem: (
    params: {
      cartItemId: number;
      amount: number;
      note: string;
    },
    options?: Partial<RequestConfig>
  ) => Promise<Cart>;

  removeItem: (
    cartItemId: number,
    options?: Partial<RequestConfig>
  ) => Promise<Cart>;

  clearCart: (options?: Partial<RequestConfig>) => Promise<Cart>;
}
