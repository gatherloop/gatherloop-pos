import { createParam } from 'solito';
import { useRouter } from 'solito/router';

export type WalletUpdateScreenParams = {
  walletId: number;
};

const { useParam } = createParam<WalletUpdateScreenParams>();

export const useWalletUpdateScreenState = (props: WalletUpdateScreenParams) => {
  const [walletId] = useParam('walletId', {
    initial: props.walletId,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : NaN,
  });

  const router = useRouter();

  const onSuccess = () => {
    router.push('/wallets');
  };

  return { walletId, onSuccess };
};
