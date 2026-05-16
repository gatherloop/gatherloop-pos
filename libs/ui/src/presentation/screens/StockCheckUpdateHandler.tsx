import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, StockCheckUpdateUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useStockCheckUpdateController,
} from '../controllers';
import { StockCheckUpdateScreen } from './StockCheckUpdateScreen';

export type StockCheckUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  stockCheckUpdateUsecase: StockCheckUpdateUsecase;
};

export const StockCheckUpdateHandler = ({
  authLogoutUsecase,
  stockCheckUpdateUsecase,
}: StockCheckUpdateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const stockCheckUpdate = useStockCheckUpdateController(stockCheckUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (stockCheckUpdate.state.type === 'submitSuccess') {
      router.push('/stock-checks');
    }
  }, [stockCheckUpdate.state.type, router]);

  return (
    <StockCheckUpdateScreen
      form={stockCheckUpdate.form}
      onSubmit={(values) =>
        stockCheckUpdate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        stockCheckUpdate.state.type === 'submitting' ||
        stockCheckUpdate.state.type === 'submitError' ||
        stockCheckUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={stockCheckUpdate.state.type === 'submitting'}
      serverError={
        stockCheckUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
