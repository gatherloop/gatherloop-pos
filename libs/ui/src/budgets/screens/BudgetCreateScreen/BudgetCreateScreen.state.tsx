import { useRouter } from 'solito/router';

export const useBudgetCreateScreenState = () => {
  const router = useRouter();

  const onSuccess = () => {
    router.push('/budgets');
  };

  return { onSuccess };
};
