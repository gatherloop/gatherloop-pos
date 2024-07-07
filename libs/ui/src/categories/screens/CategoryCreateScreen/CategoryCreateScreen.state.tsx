import { useRouter } from 'solito/router';

export const useCategoryCreateScreenState = () => {
  const router = useRouter();

  const onSuccess = () => {
    router.push('/categories');
  };

  return { onSuccess };
};
