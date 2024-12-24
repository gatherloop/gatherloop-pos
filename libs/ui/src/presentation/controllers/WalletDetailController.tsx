import { WalletDetailUsecase } from '../../domain';
import { useController } from './controller';

export const useWalletDetailController = (usecase: WalletDetailUsecase) => {
  const { state, dispatch } = useController(usecase);
  return {
    state,
    dispatch,
    balance: state.wallet?.balance ?? 0,
    name: state.wallet?.name ?? '',
    paymentCostPercentage: state.wallet?.paymentCostPercentage ?? 0,
  };
};
