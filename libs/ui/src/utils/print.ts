import { useToastController } from '@tamagui/toast';

export type TransactionPrintPayload = {
  type: 'INVOICE' | 'ORDER_SLIP';
  transaction: {
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
};

export const usePrinter = () => {
  const toast = useToastController();

  const print = (transaction: TransactionPrintPayload): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket('ws://localhost:8080');
      socket.onopen = () => {
        socket.send(JSON.stringify(transaction));
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
