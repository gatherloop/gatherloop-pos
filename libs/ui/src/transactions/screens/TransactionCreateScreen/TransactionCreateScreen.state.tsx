import { useRouter } from 'solito/router';

export const useTransactionCreateScreenState = () => {
  const router = useRouter();

  const onSuccess = () => {
    router.push('/transactions');
  };

  return { onSuccess };
};
