import { useToastController } from '@tamagui/toast';

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

export const usePrinter = () => {
  const toast = useToastController();

  const print = (payload: PrintPayload): Promise<void> => {
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
  };

  return { print };
};
