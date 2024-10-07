import { WalletListItem } from '../../components';
import { useWalletDetailController } from '../../../../controllers';

export const WalletDetail = () => {
  const { state } = useWalletDetailController();
  return (
    <WalletListItem
      balance={state.wallet?.balance ?? 0}
      name={state.wallet?.name ?? ''}
      paymentCostPercentage={state.wallet?.paymentCostPercentage ?? 0}
    />
  );
};
