import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  CategoryDeleteAlert,
  CategoryList,
  Layout,
  CategoryListProps,
} from '../components';
import { Category } from '../../domain';

export type CategoryListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (category: Category) => void;
  onDeleteMenuPress: (category: Category) => void;
  onItemPress: (category: Category) => void;
  onRetryButtonPress: () => void;
  variant: CategoryListProps['variant'];
  isRevalidating?: boolean;
  isDeleteButtonDisabled: boolean;
  isDeleteModalOpen: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
};

export const CategoryListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
  isDeleteButtonDisabled,
  isDeleteModalOpen,
  onDeleteCancel,
  onDeleteConfirm,
}: CategoryListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Categories"
      rightActionItem={
        <Link href="/categories/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <CategoryList
        onRetryButtonPress={onRetryButtonPress}
        variant={variant}
        isRevalidating={isRevalidating}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <CategoryDeleteAlert
        isOpen={isDeleteModalOpen}
        isButtonDisabled={isDeleteButtonDisabled}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
      />
    </Layout>
  );
};
