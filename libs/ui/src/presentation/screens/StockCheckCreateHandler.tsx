import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, StockCheckCreateUsecase } from '../../domain';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useStockCheckCreateController,
} from '../controllers';
import { StockCheckCreateScreen } from './StockCheckCreateScreen';

export type StockCheckCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  stockCheckCreateUsecase: StockCheckCreateUsecase;
};

export const StockCheckCreateHandler = ({
  authLogoutUsecase,
  stockCheckCreateUsecase,
}: StockCheckCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const stockCheckCreate = useStockCheckCreateController(stockCheckCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (stockCheckCreate.state.type === 'submitSuccess') {
      router.push('/stock-checks');
    }
  }, [stockCheckCreate.state.type, router]);

  return (
    <StockCheckCreateScreen
      form={stockCheckCreate.form}
      onSubmit={(values) =>
        stockCheckCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        stockCheckCreate.state.type === 'submitting' ||
        stockCheckCreate.state.type === 'submitError' ||
        stockCheckCreate.state.type === 'submitSuccess'
      }
      isSubmitting={stockCheckCreate.state.type === 'submitting'}
      serverError={
        stockCheckCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
