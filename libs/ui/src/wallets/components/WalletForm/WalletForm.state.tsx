// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  WalletRequest,
  walletRequestSchema,
  useWalletCreate,
  useWalletFindById,
  useWalletUpdateById,
} from '../../../../../api-contract/src';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';

export type UseWalletFormStateProps = {
  variant: { type: 'create' } | { type: 'update'; walletId: number };
  onSuccess: () => void;
};

export const useWalletFormState = ({
  variant,
  onSuccess,
}: UseWalletFormStateProps) => {
  const walletId = variant.type === 'update' ? variant.walletId : -1;

  const wallet = useWalletFindById(walletId, {
    query: { enabled: variant.type === 'update' },
  });

  const createWalletMutation = useWalletCreate();
  const updateWalletMutation = useWalletUpdateById(walletId);
  const mutation =
    variant.type === 'create' ? createWalletMutation : updateWalletMutation;

  const formik = useFormik<WalletRequest>({
    initialValues: {
      name: wallet.data?.data.name ?? '',
      balance: wallet.data?.data.balance ?? 0,
      costPercentage: wallet.data?.data.costPercentage ?? 0,
    },
    enableReinitialize: true,
    onSubmit: (values) => mutation.mutateAsync(values).then(onSuccess),
    validationSchema: toFormikValidationSchema(walletRequestSchema),
  });

  return { formik };
};
