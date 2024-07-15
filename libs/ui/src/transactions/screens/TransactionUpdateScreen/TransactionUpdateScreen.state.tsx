import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type TransactionUpdateScreenParams = {
  transactionId: number;
};

const { useParam } = createParam<TransactionUpdateScreenParams>();

export const useTransactionUpdateScreenState = (
  props: TransactionUpdateScreenParams
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

  const router = useRouter();

  const onSuccess = () => {
    router.push('/transactions');
  };

  return { transactionId, onSuccess };
};
