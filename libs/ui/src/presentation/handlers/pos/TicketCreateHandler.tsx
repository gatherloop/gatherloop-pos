import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, TicketCreateUsecase } from '../../../domain';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout } from '../hooks';
import {
  TicketCreateScreen,
  TicketCreateScreenProps,
} from '../../views/screens/pos/TicketCreateScreen';

export type TicketCreateHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  ticketCreateUsecase: TicketCreateUsecase;
};

export const TicketCreateHandler = ({
  authLogoutUsecase,
  ticketCreateUsecase,
}: TicketCreateHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const ticketCreate = useUsecase(ticketCreateUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    if (ticketCreate.state.type === 'submitSuccess') {
      toast.show('Create Ticket Success');
      router.push('/tickets');
    } else if (ticketCreate.state.type === 'submitError') {
      toast.show('Create Ticket Error');
    }
  }, [ticketCreate.state.type, toast, router]);

  return (
    <TicketCreateScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      defaultValues={ticketCreate.state.values}
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
