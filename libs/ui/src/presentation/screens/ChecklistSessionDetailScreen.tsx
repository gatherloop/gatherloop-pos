import { Button } from 'tamagui';
import { Trash } from '@tamagui/lucide-icons';
import {
  ChecklistSessionDeleteAlert,
  ChecklistSessionExecution,
  Layout,
} from '../components';
import { ChecklistSession } from '../../domain';

export type ChecklistSessionDetailScreenProps = {
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  onCheckItem: (itemId: number) => void;
  onUncheckItem: (itemId: number) => void;
  onCheckSubItem: (subItemId: number) => void;
  onUncheckSubItem: (subItemId: number) => void;
  onDeletePress: (session: ChecklistSession) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  togglingItemId: number | null;
  togglingSubItemId: number | null;
  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'loaded'; checklistSession: ChecklistSession };
};

export const ChecklistSessionDetailScreen = ({
  onLogoutPress,
  onRetryButtonPress,
  onCheckItem,
  onUncheckItem,
  onCheckSubItem,
  onUncheckSubItem,
  onDeletePress,
  onDeleteConfirm,
  onDeleteCancel,
  togglingItemId,
  togglingSubItemId,
  isDeleteModalOpen,
  isDeleteButtonDisabled,
  variant,
}: ChecklistSessionDetailScreenProps) => {
  const session =
    variant.type === 'loaded' ? variant.checklistSession : null;

  return (
    <Layout
      title="Checklist Session"
      showBackButton
      onLogoutPress={onLogoutPress}
      rightActionItem={
        session ? (
          <Button
            size="$3"
            icon={Trash}
            variant="outlined"
            onPress={() => onDeletePress(session)}
          />
        ) : undefined
      }
    >
      <ChecklistSessionExecution
        variant={variant}
        onCheckItem={onCheckItem}
        onUncheckItem={onUncheckItem}
        onCheckSubItem={onCheckSubItem}
        onUncheckSubItem={onUncheckSubItem}
        togglingItemId={togglingItemId}
        togglingSubItemId={togglingSubItemId}
        onRetryButtonPress={onRetryButtonPress}
      />
      <ChecklistSessionDeleteAlert
        isOpen={isDeleteModalOpen}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        isButtonDisabled={isDeleteButtonDisabled}
      />
    </Layout>
  );
};
