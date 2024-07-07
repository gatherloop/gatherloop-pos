import { useRouter } from 'solito/router';

export const useMaterialCreateScreenState = () => {
  const router = useRouter();

  const onSuccess = () => {
    router.push('/materials');
  };

  return { onSuccess };
};
