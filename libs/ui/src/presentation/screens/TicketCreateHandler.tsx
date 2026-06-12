import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, TicketCreateUsecase } from '../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useTicketCreateController,
} from '../controllers';
import {
  TicketCreateScreen,
  TicketCreateScreenProps,
} from './TicketCreateScreen';

export type TicketCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  ticketCreateUsecase: TicketCreateUsecase;
};

export const TicketCreateHandler = ({
  authLogoutUsecase,
  ticketCreateUsecase,
}: TicketCreateHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const ticketCreate = useTicketCreateController(ticketCreateUsecase);
  const router = useRouter();

  useEffect(() => {
    if (ticketCreate.state.type === 'submitSuccess')
      router.push('/tickets');
  }, [ticketCreate.state.type, router]);

  return (
    <TicketCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      form={ticketCreate.form}
      isSubmitDisabled={
        ticketCreate.state.type === 'submitting' ||
        ticketCreate.state.type === 'submitSuccess'
      }
      isSubmitting={ticketCreate.state.type === 'submitting'}
      serverError={
        ticketCreate.state.type === 'submitError'
          ? 'Failed to submit. Please try again.'
          : undefined
      }
      onSubmit={(values) =>
        ticketCreate.dispatch({ type: 'SUBMIT', values })
      }
      variant={match(ticketCreate.state)
        .returnType<TicketCreateScreenProps['variant']>()
        .with({ type: 'loaded' }, () => ({ type: 'loaded' }))
        .with(
          {
            type: P.union('submitting', 'submitSuccess', 'submitError'),
          },
          () => ({
            type: 'loaded',
          })
        )
        .exhaustive()}
    />
  );
};
