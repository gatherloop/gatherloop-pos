import { useCallback } from 'react';
import { useToastController } from '@tamagui/toast';
import { Variant } from '../domain/entities/Variant';

export type OrderSlipStation = 'KITCHEN' | 'BAR';

export type TransactionPrintPayload = {
  createdAt: string;
  paidAt?: string;
  name: string;
  orderNumber: number;
  items: {
    name: string;
    price: number;
    amount: number;
    discountAmount: number;
    note: string;
  }[];
  coupons: {
    code: string;
    type: 'FIXED' | 'PERCENTAGE';
    amount: number;
  }[];
  isCashless: boolean;
  paidAmount: number;
};

export type PurchaseListPrintPayload = {
  stockCheckDate: string;
  totalEstimatedCost: number;
  supplierNames: string[];
  items: {
    materialName: string;
    purchaseQuantity: number;
    purchaseUnit: string;
    estimatedCost: number;
    supplierName: string;
  }[];
};

export type CheckinPrintPayload = {
  createdAt: string;
  name: string;
  tickets: {
    name: string;
    variant: string;
  }[];
};

export type PrintPayload =
  | {
      type: 'INVOICE' | 'ORDER_SLIP';
      // Present once a slip has been split by station (see buildOrderSlipPayload).
      // Optional for now so existing unsplit ORDER_SLIP call sites still type-check.
      station?: OrderSlipStation;
      transaction: TransactionPrintPayload;
    }
  | {
      type: 'PURCHASE_LIST';
      purchaseList: PurchaseListPrintPayload;
    }
  | {
      type: 'CHECKIN_SLIP';
      checkin: CheckinPrintPayload;
    };

export type OrderSlipSourceItem = {
  variant: Variant;
  price: number;
  amount: number;
  discountAmount: number;
  note: string;
};

export type OrderSlipSource = Omit<TransactionPrintPayload, 'items'> & {
  items: OrderSlipSourceItem[];
};

export const buildOrderSlipPayload = (
  transaction: OrderSlipSource,
  station: OrderSlipStation
): PrintPayload | null => {
  const items = transaction.items.filter(
    ({ variant }) => variant.product.category.station === station
  );

  if (items.length === 0) {
    return null;
  }

  return {
    type: 'ORDER_SLIP',
    station,
    transaction: {
      ...transaction,
      items: items.map(({ variant, price, amount, discountAmount, note }) => ({
        name: `${variant.product.name} - ${variant.values
          .map(({ optionValue: { name } }) => name)
          .join(' - ')}`,
        price,
        amount,
        discountAmount,
        note,
      })),
    },
  };
};

export const usePrinter = () => {
  const toast = useToastController();

  const print = useCallback(
    (payload: PrintPayload): Promise<void> => {
      return new Promise((resolve, reject) => {
        const socket = new WebSocket('ws://localhost:8080');
        socket.onopen = () => {
          socket.send(JSON.stringify(payload));
        };

        socket.onmessage = (event) => {
          toast.show('Printing info', { message: event.data });
          resolve();
        };

        socket.onerror = () => {
          toast.show('Printing info', { message: 'Cannot connect to printer' });
          reject();
        };
      });
    },
    [toast]
  );

  return { print };
};
