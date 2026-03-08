import { useRouter } from 'solito/router';
import { useEffect } from 'react';
import {
  useWalletTransferCreateController,
  useAuthLogoutController,
} from '../controllers';
import { AuthLogoutUsecase, WalletTransferCreateUsecase } from '../../domain';
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
  const walletTransferCreate = useWalletTransferCreateController(
    walletTransferCreateUsecase
  );
  const authLogout = useAuthLogoutController(authLogoutUsecase);

  useEffect(() => {
    if (walletTransferCreate.state.type === 'submitSuccess')
      router.push(`/wallets/${walletId}/transfers`);
  }, [walletTransferCreate.state.type, router, walletId]);

  return (
    <WalletTransferCreateScreen
      form={walletTransferCreate.form}
      onSubmit={(values) =>
        walletTransferCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={walletTransferCreate.state.type === 'submitting'}
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
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
