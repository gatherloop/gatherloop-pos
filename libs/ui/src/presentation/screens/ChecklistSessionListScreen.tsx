import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { ChecklistSessionList, Layout } from '../components';
import { ChecklistSession, ChecklistSessionListFilter } from '../../domain';

export type ChecklistSessionListScreenProps = {
  onLogoutPress: () => void;
  onItemPress: (checklistSession: ChecklistSession) => void;
  onRetryButtonPress: () => void;
  onFilterChange: (filter: ChecklistSessionListFilter) => void;
  onPageChange: (page: number) => void;
  filter: ChecklistSessionListFilter;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: ChecklistSession[] };
};

export const ChecklistSessionListScreen = ({
  onLogoutPress,
  onItemPress,
  onRetryButtonPress,
  onFilterChange,
  onPageChange,
  filter,
  currentPage,
  totalItem,
  itemPerPage,
  variant,
}: ChecklistSessionListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Checklist Sessions"
      rightActionItem={
        <Link href="/checklist-sessions/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ChecklistSessionList
        variant={variant}
        filter={filter}
        onFilterChange={onFilterChange}
        onRetryButtonPress={onRetryButtonPress}
        onPageChange={onPageChange}
        onItemPress={onItemPress}
        currentPage={currentPage}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
      />
    </Layout>
  );
};
