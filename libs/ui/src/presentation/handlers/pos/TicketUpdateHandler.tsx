import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, TicketUpdateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  TicketUpdateScreen,
  TicketUpdateScreenProps,
} from '../../screens/pos/TicketUpdateScreen';

export type TicketUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  ticketUpdateUsecase: TicketUpdateUsecase;
};

export const TicketUpdateHandler = ({
  authLogoutUsecase,
  ticketUpdateUsecase,
}: TicketUpdateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const ticketUpdate = useUsecase(ticketUpdateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (ticketUpdate.state.type === 'submitSuccess') {
      toast.show('Update Ticket Success');
      router.push('/tickets');
    } else if (ticketUpdate.state.type === 'submitError') {
      toast.show('Update Ticket Error');
    }
  }, [ticketUpdate.state.type, toast, router]);

  return (
    <TicketUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={ticketUpdate.state.values}
      isSubmitDisabled={
        ticketUpdate.state.type === 'submitting' ||
        ticketUpdate.state.type === 'submitSuccess'
      }
      isSubmitting={ticketUpdate.state.type === 'submitting'}
      serverError={
        ticketUpdate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) =>
        ticketUpdate.dispatch({ type: 'SUBMIT', values })
      }
      variant={match(ticketUpdate.state)
        .returnType<TicketUpdateScreenProps['variant']>()
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
          onRetryButtonPress: () => ticketUpdate.dispatch({ type: 'FETCH' }),
        }))
        .exhaustive()}
    />
  );
};
