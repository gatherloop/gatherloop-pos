import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { TicketDeleteAlert, TicketList, Layout } from '../components';
import type { TicketListProps } from '../components';
import { Ticket } from '../../domain';

export type TicketListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (ticket: Ticket) => void;
  onDeleteMenuPress: (ticket: Ticket) => void;
  onItemPress: (ticket: Ticket) => void;
  onRetryButtonPress: () => void;
  variant: TicketListProps['variant'];
  isRevalidating?: boolean;
  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onEmptyActionPress?: () => void;
};

export const TicketListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
  isDeleteModalOpen,
  isDeleteButtonDisabled,
  onDeleteCancel,
  onDeleteConfirm,
  onEmptyActionPress,
}: TicketListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Tickets"
      rightActionItem={
        <Link href="/tickets/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <TicketList
        onRetryButtonPress={onRetryButtonPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onItemPress={onItemPress}
        variant={variant}
        isRevalidating={isRevalidating}
        onEmptyActionPress={onEmptyActionPress}
      />
      <TicketDeleteAlert
        isOpen={isDeleteModalOpen}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        isButtonDisabled={isDeleteButtonDisabled}
      />
    </Layout>
  );
};
