import { useToastController } from '@tamagui/toast';

export type TransactionPrintPayload = {
  createdAt: string;
  paidAt?: string;
  name: string;
  items: {
    name: string;
    price: number;
    amount: number;
    discountAmount: number;
  }[];
};

export const usePrinter = () => {
  const toast = useToastController();

  const print = (transaction: TransactionPrintPayload) => {
    const socket = new WebSocket('ws://localhost:8080');
    socket.onopen = () => {
      socket.send(JSON.stringify(transaction));
    };

    socket.onmessage = (event) => {
      toast.show('Printing info', { message: event.data });
    };

    socket.onerror = () => {
      toast.show('Printing info', { message: 'Cannot connect to printer' });
    };
  };

  return { print };
};
