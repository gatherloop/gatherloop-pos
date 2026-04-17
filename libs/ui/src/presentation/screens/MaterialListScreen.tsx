import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  MaterialDeleteAlert,
  MaterialList,
  Layout,
  MaterialListProps,
} from '../components';
import { Material } from '../../domain';

export type MaterialListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (material: Material) => void;
  onDeleteMenuPress: (material: Material) => void;
  onItemPress: (material: Material) => void;
  onRetryButtonPress: () => void;
  variant: MaterialListProps['variant'];
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
  isRevalidating?: boolean;
  onEmptyActionPress?: () => void;
};

export const MaterialListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
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
  isRevalidating,
  onEmptyActionPress,
}: MaterialListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Materials"
      rightActionItem={
        <Link href="/materials/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <MaterialList
        variant={variant}
        searchValue={searchValue}
        onSearchValueChange={onSearchValueChange}
        currentPage={currentPage}
        onPageChange={onPageChange}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
        onRetryButtonPress={onRetryButtonPress}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
        isRevalidating={isRevalidating}
        onEmptyActionPress={onEmptyActionPress}
      />
      <MaterialDeleteAlert
        isOpen={isDeleteModalOpen}
        isButtonDisabled={isDeleteButtonDisabled}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
      />
    </Layout>
  );
};
