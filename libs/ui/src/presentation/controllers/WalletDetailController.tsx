import { WalletDetailUsecase } from '../../domain';
import { useController } from './controller';

export const useWalletDetailController = (usecase: WalletDetailUsecase) => {
  const { state, dispatch } = useController(usecase);
  return {
    state,
    dispatch,
  };
};
