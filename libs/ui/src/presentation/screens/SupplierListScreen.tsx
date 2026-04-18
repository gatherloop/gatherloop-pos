import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { SupplierDeleteAlert, SupplierList, Layout } from '../components';
import { Supplier } from '../../domain';

export type SupplierListScreenProps = {
  onLogoutPress: () => void;
  onDeleteMenuPress: (supplier: Supplier) => void;
  onOpenMapMenuPress: (supplier: Supplier) => void;
  onEditMenuPress: (supplier: Supplier) => void;
  onItemPress: (supplier: Supplier) => void;
  onRetryButtonPress: () => void;
  variant: { type: 'loading' } | { type: 'error' } | { type: 'empty' } | { type: 'loaded'; items: Supplier[] };
  suppliers: Supplier[];
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
  isChangingParams?: boolean;
  onSearchClear?: () => void;
  onEmptyActionPress?: () => void;
};

export const SupplierListScreen = ({
  onLogoutPress,
  onDeleteMenuPress,
  onOpenMapMenuPress,
  onEditMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
  suppliers,
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
  isChangingParams,
  onSearchClear,
  onEmptyActionPress,
}: SupplierListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Suppliers"
      rightActionItem={
        <Link href="/suppliers/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <SupplierList
        variant={variant}
        searchValue={searchValue}
        onSearchValueChange={onSearchValueChange}
        onRetryButtonPress={onRetryButtonPress}
        onPageChange={onPageChange}
        onOpenMapMenuPress={onOpenMapMenuPress}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
        currentPage={currentPage}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
        isRevalidating={isRevalidating}
        isChangingParams={isChangingParams}
        onSearchClear={onSearchClear}
        onEmptyActionPress={onEmptyActionPress}
      />
      <SupplierDeleteAlert
        isOpen={isDeleteModalOpen}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        isButtonDisabled={isDeleteButtonDisabled}
      />
    </Layout>
  );
};
