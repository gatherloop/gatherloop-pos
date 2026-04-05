import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  ChecklistTemplateDeleteAlert,
  ChecklistTemplateList,
  Layout,
} from '../components';
import { ChecklistTemplate } from '../../domain';

export type ChecklistTemplateListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (checklistTemplate: ChecklistTemplate) => void;
  onDeleteMenuPress: (checklistTemplate: ChecklistTemplate) => void;
  onItemPress: (checklistTemplate: ChecklistTemplate) => void;
  onRetryButtonPress: () => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: ChecklistTemplate[] };
  checklistTemplates: ChecklistTemplate[];
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
};

export const ChecklistTemplateListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
  checklistTemplates: _checklistTemplates,
  searchValue,
  onSearchValueChange,
  currentPage,
  onPageChange,
  totalItem,
  itemPerPage,
  isDeleteModalOpen,
  isDeleteButtonDisabled,
  onDeleteCancel,
  onDeleteConfirm,
}: ChecklistTemplateListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Checklist Templates"
      rightActionItem={
        <Link href="/checklist-templates/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ChecklistTemplateList
        variant={variant}
        searchValue={searchValue}
        onSearchValueChange={onSearchValueChange}
        onRetryButtonPress={onRetryButtonPress}
        onPageChange={onPageChange}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
        currentPage={currentPage}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
      />
      <ChecklistTemplateDeleteAlert
        isOpen={isDeleteModalOpen}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        isButtonDisabled={isDeleteButtonDisabled}
      />
    </Layout>
  );
};
