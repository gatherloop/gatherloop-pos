import { WalletTransferListUsecase } from '../../domain';
import { useController } from './controller';

export const useWalletTransferListController = (
  usecase: WalletTransferListUsecase
) => {
  const { state, dispatch } = useController(usecase);
  return {
    state,
    dispatch,
  };
};
