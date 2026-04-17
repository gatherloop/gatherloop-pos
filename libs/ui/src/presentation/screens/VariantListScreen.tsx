import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { VariantDeleteAlert, VariantList, Layout } from '../components';
import { Variant } from '../../domain';

export type VariantListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (variant: Variant) => void;
  onDeleteMenuPress: (variant: Variant) => void;
  onItemPress: (variant: Variant) => void;
  onRetryButtonPress: () => void;
  variant: { type: 'loading' } | { type: 'error' } | { type: 'empty' } | { type: 'loaded'; items: Variant[] };
  variants: Variant[];
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

export const VariantListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
  variants,
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
}: VariantListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Variants"
      rightActionItem={
        <Link href="/variants/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <VariantList
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
        isRevalidating={isRevalidating}
        onEmptyActionPress={onEmptyActionPress}
      />
      <VariantDeleteAlert
        isOpen={isDeleteModalOpen}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        isButtonDisabled={isDeleteButtonDisabled}
      />
    </Layout>
  );
};
