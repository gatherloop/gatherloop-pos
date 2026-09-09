import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, StockCheckCreateUsecase } from '../../../domain';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import { StockCheckCreateScreen } from '../../screens/pos/StockCheckCreateScreen';

export type StockCheckCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  stockCheckCreateUsecase: StockCheckCreateUsecase;
};

export const StockCheckCreateHandler = ({
  authLogoutUsecase,
  stockCheckCreateUsecase,
}: StockCheckCreateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const stockCheckCreate = useUsecase(stockCheckCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (stockCheckCreate.state.type === 'submitSuccess') {
      toast.show('Create Stock Check Success');
      router.push('/stock-checks');
    } else if (stockCheckCreate.state.type === 'submitError') {
      toast.show('Create Stock Check Error');
    }
  }, [stockCheckCreate.state.type, router, toast]);

  return (
    <StockCheckCreateScreen
      variant={{ type: 'loaded' }}
      defaultValues={stockCheckCreate.state.values}
      onSubmit={(values) =>
        stockCheckCreate.dispatch({ type: 'SUBMIT', values })
      }
      isSubmitDisabled={
        stockCheckCreate.state.type === 'submitting' ||
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
