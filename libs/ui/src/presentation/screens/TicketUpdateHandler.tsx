import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, TicketUpdateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useTicketUpdateController,
} from '../controllers';
import {
  TicketUpdateScreen,
  TicketUpdateScreenProps,
} from './TicketUpdateScreen';

export type TicketUpdateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  ticketUpdateUsecase: TicketUpdateUsecase;
};

export const TicketUpdateHandler = ({
  authLogoutUsecase,
  ticketUpdateUsecase,
}: TicketUpdateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const ticketUpdate = useTicketUpdateController(ticketUpdateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (ticketUpdate.state.type === 'submitSuccess')
      router.push('/tickets');
  }, [ticketUpdate.state.type, router]);

  return (
    <TicketUpdateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={ticketUpdate.form}
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
