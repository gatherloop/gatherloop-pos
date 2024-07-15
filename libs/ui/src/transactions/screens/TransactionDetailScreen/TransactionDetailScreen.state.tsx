import { createParam } from 'solito';

export type TransactionDetailScreenParams = {
  transactionId: number;
};

const { useParam } = createParam<TransactionDetailScreenParams>();

export const useTransactionDetailScreenState = (
  props: TransactionDetailScreenParams
) => {
  const [transactionId] = useParam('transactionId', {
    initial: props.transactionId,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : NaN,
  });

  return { transactionId };
};
