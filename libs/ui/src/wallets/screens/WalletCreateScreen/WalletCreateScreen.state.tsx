import { useRouter } from 'solito/router';

export const useWalletCreateScreenState = () => {
  const router = useRouter();

  const onSuccess = () => {
    router.push('/wallets');
  };

  return { onSuccess };
};
