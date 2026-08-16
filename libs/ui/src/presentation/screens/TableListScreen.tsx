import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { TableDeleteAlert, TableList, Layout } from '../components';
import type { TableListProps } from '../components';
import { Table } from '../../domain';

export type TableListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (table: Table) => void;
  onDeleteMenuPress: (table: Table) => void;
  onItemPress: (table: Table) => void;
  onRetryButtonPress: () => void;
  variant: TableListProps['variant'];
  isRevalidating?: boolean;
  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onEmptyActionPress?: () => void;
};

export const TableListScreen = ({
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
}: TableListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Tables"
      rightActionItem={
        <Link href="/tables/create">
          <Button size="$3" icon={Plus} variant="outlined" />
        </Link>
      }
    >
      <TableList
        onRetryButtonPress={onRetryButtonPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onItemPress={onItemPress}
        variant={variant}
        isRevalidating={isRevalidating}
        onEmptyActionPress={onEmptyActionPress}
      />
      <TableDeleteAlert
        isOpen={isDeleteModalOpen}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        isButtonDisabled={isDeleteButtonDisabled}
      />
    </Layout>
  );
};
