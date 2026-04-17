import { Button } from 'tamagui';
import {
  CalculationList,
  CalculationDeleteAlert,
  Layout,
  CalculationCompleteAlert,
  CalculationListProps,
} from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { Calculation } from '../../domain';

export type CalculationListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (calculation: Calculation) => void;
  onDeleteMenuPress: (calculation: Calculation) => void;
  onCompleteMenuPress: (calculation: Calculation) => void;
  onItemPress: (calculation: Calculation) => void;
  onRetryButtonPress: () => void;
  variant: CalculationListProps['variant'];
  isRevalidating?: boolean;

  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  onDeleteCancel: () => void;
  onDeleteButtonConfirmPress: () => void;

  isCompleteModalOpen: boolean;
  isCompleteButtonDisabled: boolean;
  onCompleteCancel: () => void;
  onCompleteButtonConfirmPress: () => void;
  onEmptyActionPress?: () => void;
};

export const CalculationListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onCompleteMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
  isDeleteModalOpen,
  isDeleteButtonDisabled,
  onDeleteCancel,
  onDeleteButtonConfirmPress,
  isCompleteModalOpen,
  isCompleteButtonDisabled,
  onCompleteCancel,
  onCompleteButtonConfirmPress,
  onEmptyActionPress,
}: CalculationListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Calculations"
      rightActionItem={
        <Link href="/calculations/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <CalculationList
        onRetryButtonPress={onRetryButtonPress}
        variant={variant}
        isRevalidating={isRevalidating}
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onCompleteMenuPress={onCompleteMenuPress}
        onItemPress={onItemPress}
        onEmptyActionPress={onEmptyActionPress}
      />
      <CalculationDeleteAlert
        isOpen={isDeleteModalOpen}
        isButtonDisabled={isDeleteButtonDisabled}
        onCancel={onDeleteCancel}
        onButtonConfirmPress={onDeleteButtonConfirmPress}
      />
      <CalculationCompleteAlert
        isOpen={isCompleteModalOpen}
        isButtonDisabled={isCompleteButtonDisabled}
        onCancel={onCompleteCancel}
        onButtonConfirmPress={onCompleteButtonConfirmPress}
      />
    </Layout>
  );
};
