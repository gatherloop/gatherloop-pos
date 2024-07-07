import { useRouter } from 'solito/router';

export const useProductCreateScreenState = () => {
  const router = useRouter();

  const onSuccess = () => {
    router.push('/products');
  };

  return { onSuccess };
};
