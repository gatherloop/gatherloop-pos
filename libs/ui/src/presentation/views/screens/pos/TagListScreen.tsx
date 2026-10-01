import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  TagDeleteAlert,
  TagList,
  Layout,
  TagListProps,
} from '../../components';
import { Tag } from '../../../../domain';

export type TagListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (tag: Tag) => void;
  onAssignMenuPress: (tag: Tag) => void;
  onDeleteMenuPress: (tag: Tag) => void;
  onItemPress: (tag: Tag) => void;
  onRetryButtonPress: () => void;
  variant: TagListProps['variant'];
  isRevalidating?: boolean;
  isDeleteButtonDisabled: boolean;
  isDeleteModalOpen: boolean;
  deleteVariantCount?: number;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onEmptyActionPress?: () => void;
};

export const TagListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onAssignMenuPress,
  onDeleteMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
  isDeleteButtonDisabled,
  isDeleteModalOpen,
  deleteVariantCount,
  onDeleteCancel,
  onDeleteConfirm,
  onEmptyActionPress,
}: TagListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Tags"
      rightActionItem={
        <Link href="/tags/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <TagList
        onRetryButtonPress={onRetryButtonPress}
        variant={variant}
        isRevalidating={isRevalidating}
        onEditMenuPress={onEditMenuPress}
        onAssignMenuPress={onAssignMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
        onEmptyActionPress={onEmptyActionPress}
      />
      <TagDeleteAlert
        isOpen={isDeleteModalOpen}
        isButtonDisabled={isDeleteButtonDisabled}
        variantCount={deleteVariantCount}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
      />
    </Layout>
  );
};
