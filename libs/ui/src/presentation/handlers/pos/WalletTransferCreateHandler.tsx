import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import { AuthLogoutUsecase, WalletTransferCreateUsecase } from '../../../domain';
import { WalletTransferCreateScreen } from '../../views/screens/pos/WalletTransferCreateScreen';

export type WalletTransferCreateHandlerProps = {
  walletId: number;
  walletTransferCreateUsecase: WalletTransferCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const WalletTransferCreateHandler = ({
  walletId,
  walletTransferCreateUsecase,
  authLogoutUsecase,
}: WalletTransferCreateHandlerProps) => {
  const router = useRouter();
  const walletTransferCreate = useUsecase(walletTransferCreateUsecase);
  const authLogout = useAuthLogout(authLogoutUsecase);
  const toast = useToastController();

  useEffect(() => {
    if (walletTransferCreate.state.type === 'submitSuccess') {
      toast.show('Transfer Success');
      router.push(`/wallets/${walletId}/transfers`);
    } else if (walletTransferCreate.state.type === 'submitError') {
      toast.show('Transfer Error');
    }
  }, [walletTransferCreate.state.type, router, walletId, toast]);

  return (
    <WalletTransferCreateScreen
      defaultValues={walletTransferCreate.state.values}
      onSubmit={(values) =>
        walletTransferCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={walletTransferCreate.state.type === 'submitting'}
      isSubmitting={walletTransferCreate.state.type === 'submitting'}
      serverError={
        walletTransferCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      variant={{ type: 'loaded' }}
      walletSelectOptions={walletTransferCreate.state.wallets
        .filter(
          (wallet) =>
            wallet.id !== walletTransferCreate.state.values.fromWalletId
        )
        .map((wallet) => ({
          label: wallet.name,
          value: wallet.id,
        }))}
    />
  );
};
