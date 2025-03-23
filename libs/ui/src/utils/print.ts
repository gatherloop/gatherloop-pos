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

export const print = (transaction: TransactionPrintPayload) => {
  const socket = new WebSocket('ws://localhost:8080');
  socket.onopen = () => {
    socket.send(JSON.stringify(transaction));
    setTimeout(() => {
      socket.close();
    }, 1000);
  };
};
