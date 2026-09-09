import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Ticket,
  TicketDeleteUsecase,
  TicketListUsecase,
} from '../../../domain';
import { TicketListScreen, TicketListScreenProps } from '../../screens/pos/TicketListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import { useToastController } from '@tamagui/toast';
import { useUsecase, useAuthLogout, useTicketList } from '../hooks';

export type TicketListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  ticketListUsecase: TicketListUsecase;
  ticketDeleteUsecase: TicketDeleteUsecase;
};

export const TicketListHandler = ({
  authLogoutUsecase,
  ticketListUsecase,
  ticketDeleteUsecase,
}: TicketListHandlerProps) => {
  const authLogout = useAuthLogout(authLogoutUsecase);
  const ticketList = useTicketList(ticketListUsecase);
  const ticketDelete = useUsecase(ticketDeleteUsecase);
  const router = useRouter();
  const toast = useToastController();

  useEffect(() => {
    match(ticketDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        toast.show('Delete Ticket Success');
        ticketList.dispatch({ type: 'FETCH' });
      })
      .with({ type: 'deletingError' }, () => {
        toast.show('Delete Ticket Error');
      })
      .otherwise(() => {
        // noop
      });
  }, [ticketDelete.state, ticketList, toast]);

  return (
    <TicketListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(ticket: Ticket) => router.push(`/tickets/${ticket.id}`)}
      onItemPress={(ticket: Ticket) => router.push(`/tickets/${ticket.id}`)}
      onDeleteMenuPress={(ticket: Ticket) =>
        ticketDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          ticketId: ticket.id,
        })
      }
      onEmptyActionPress={() => router.push('/tickets/create')}
      onRetryButtonPress={() => ticketList.dispatch({ type: 'FETCH' })}
      isRevalidating={ticketList.state.type === 'revalidating'}
      variant={match(ticketList.state)
        .returnType<TicketListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with({ type: P.union('loaded', 'revalidating') }, ({ tickets }) => ({
          type: tickets.length > 0 ? 'loaded' : 'empty',
          tickets,
        }))
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      isDeleteModalOpen={match(ticketDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={ticketDelete.state.type === 'deleting'}
      onDeleteCancel={() =>
        ticketDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteConfirm={() => ticketDelete.dispatch({ type: 'DELETE' })}
    />
  );
};
