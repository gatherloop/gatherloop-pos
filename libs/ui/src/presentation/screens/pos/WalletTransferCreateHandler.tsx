import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import { useAuthLogoutController } from '../../controllers';
import { AuthLogoutUsecase, WalletTransferCreateUsecase } from '../../../domain';
import { WalletTransferCreateScreen } from './WalletTransferCreateScreen';

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
  const walletTransferCreate = useController(walletTransferCreateUsecase);
  const authLogout = useAuthLogoutController(authLogoutUsecase);
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
      // WalletTransferFormView has no fetch of its own to gate on; keep the
      // variant prop for uniformity with the other form views (see TRD §7 Phase 5).
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
