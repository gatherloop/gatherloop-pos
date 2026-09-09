import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, StockCheckUpdateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useController } from '../../controllers/controller';
import { useAuthLogoutController } from '../../controllers';
import {
  StockCheckUpdateScreen,
  StockCheckUpdateScreenProps,
} from './StockCheckUpdateScreen';

export type StockCheckUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  stockCheckUpdateUsecase: StockCheckUpdateUsecase;
};

export const StockCheckUpdateHandler = ({
  authLogoutUsecase,
  stockCheckUpdateUsecase,
}: StockCheckUpdateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const stockCheckUpdate = useController(stockCheckUpdateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (stockCheckUpdate.state.type === 'submitSuccess') {
      toast.show('Update Stock Check Success');
      router.push('/stock-checks');
    } else if (stockCheckUpdate.state.type === 'submitError') {
      toast.show('Update Stock Check Error');
    }
  }, [stockCheckUpdate.state.type, router, toast]);

  return (
    <StockCheckUpdateScreen
      defaultValues={stockCheckUpdate.state.values}
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
      variant={match(stockCheckUpdate.state)
        .returnType<StockCheckUpdateScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({
          type: 'loading',
        }))
        .with(
          {
            type: P.union(
              'loaded',
              'submitError',
              'submitSuccess',
              'submitting'
            ),
          },
          () => ({
            type: 'loaded',
          })
        )
        .with({ type: 'error' }, () => ({
          type: 'error',
          onRetryButtonPress: () =>
            stockCheckUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
