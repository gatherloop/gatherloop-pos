import { createParam } from 'solito';

export type WalletTransferListScreenParams = {
  walletId: number;
};

const { useParam } = createParam<WalletTransferListScreenParams>();

export const useWalletTransferListScreenState = (
  props: WalletTransferListScreenParams
) => {
  const [walletId] = useParam('walletId', {
    initial: props.walletId,
    parse: (value) =>
      Array.isArray(value)
        ? parseInt(value[0])
        : typeof value === 'string'
        ? parseInt(value)
        : NaN,
  });

  return { walletId };
};
