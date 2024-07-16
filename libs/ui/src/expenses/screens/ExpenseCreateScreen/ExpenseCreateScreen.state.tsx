import { useRouter } from 'solito/router';

export const useExpenseCreateScreenState = () => {
  const router = useRouter();

  const onSuccess = () => {
    router.push('/expenses');
  };

  return { onSuccess };
};
