// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  WalletTransferRequest,
  useWalletList,
  useWalletTransferCreate,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';

export type UseWalletTransferFormStateProps = {
  walletId: number;
  onSuccess?: () => void;
};

export const useWalletTransferFormState = ({
  walletId,
  onSuccess,
}: UseWalletTransferFormStateProps) => {
  const wallets = useWalletList();

  const createWalletTransfer = useWalletTransferCreate(walletId);

  const formik = useFormik<WalletTransferRequest>({
    initialValues: {
      amount: 0,
      toWalletId: -1,
    },
    onSubmit: (values) =>
      createWalletTransfer.mutateAsync(values).then(onSuccess),
  });

  return {
    formik,
    wallets: wallets.data?.data.filter(({ id }) => id !== walletId) ?? [],
  };
};
