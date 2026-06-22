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

export type OrderSlipItem = {
  name: string;
  amount: number;
  note: string;
};

// A single combined order slip whose items are grouped by station, so the bar
// and the kitchen see one slip listing each other's items (the bar can tell
// whether the kitchen still owes the customer food before calling them).
export type OrderSlipPrintPayload = {
  createdAt: string;
  paidAt?: string;
  name: string;
  orderNumber: number;
  items: {
    bars: OrderSlipItem[];
    kitchens: OrderSlipItem[];
  };
};

export type PrintPayload =
  | {
      type: 'INVOICE';
      transaction: TransactionPrintPayload;
    }
  | {
      type: 'ORDER_SLIP';
      orderSlip: OrderSlipPrintPayload;
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

export type OrderSlipSource = {
  createdAt: string;
  paidAt?: string;
  name: string;
  orderNumber: number;
  items: OrderSlipSourceItem[];
};

// Builds a single ORDER_SLIP payload with items grouped by station. Items in a
// NONE-station category (e.g. a Board Game Ticket) belong on neither group, so
// they are excluded. Returns null when no item belongs to the bar or kitchen,
// letting callers skip an empty slip.
export const buildOrderSlipPayload = (
  transaction: OrderSlipSource
): PrintPayload | null => {
  const toOrderSlipItems = (station: OrderSlipStation): OrderSlipItem[] =>
    transaction.items
      .filter(({ variant }) => variant.product.category.station === station)
      .map(({ variant, amount, note }) => ({
        name: `${variant.product.name} - ${variant.values
          .map(({ optionValue: { name } }) => name)
          .join(' - ')}`,
        amount,
        note,
      }));

  const bars = toOrderSlipItems('BAR');
  const kitchens = toOrderSlipItems('KITCHEN');

  if (bars.length === 0 && kitchens.length === 0) {
    return null;
  }

  return {
    type: 'ORDER_SLIP',
    orderSlip: {
      createdAt: transaction.createdAt,
      paidAt: transaction.paidAt,
      name: transaction.name,
      orderNumber: transaction.orderNumber,
      items: { bars, kitchens },
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
