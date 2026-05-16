import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  StockCheckDeleteAlert,
  StockCheckList,
  Layout,
  StockCheckListProps,
} from '../components';
import { StockCheck } from '../../domain';

export type StockCheckListScreenProps = {
  onLogoutPress: () => void;
  onViewMenuPress: (stockCheck: StockCheck) => void;
  onEditMenuPress: (stockCheck: StockCheck) => void;
  onDeleteMenuPress: (stockCheck: StockCheck) => void;
  onViewPurchaseListMenuPress: (stockCheck: StockCheck) => void;
  onRetryButtonPress: () => void;
  variant: StockCheckListProps['variant'];
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

export const StockCheckListScreen = ({
  onLogoutPress,
  onViewMenuPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onViewPurchaseListMenuPress,
  onRetryButtonPress,
  variant,
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
}: StockCheckListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Stock Checks"
      rightActionItem={
        <Link href="/stock-checks/create">
          <Button size="$3" icon={Plus} variant="outlined" />
        </Link>
      }
    >
      <StockCheckList
        variant={variant}
        currentPage={currentPage}
        onPageChange={onPageChange}
        totalItem={totalItem}
        itemPerPage={itemPerPage}
        onRetryButtonPress={onRetryButtonPress}
        onViewMenuPress={onViewMenuPress}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onViewPurchaseListMenuPress={onViewPurchaseListMenuPress}
        isRevalidating={isRevalidating}
        onEmptyActionPress={onEmptyActionPress}
      />
      <StockCheckDeleteAlert
        isOpen={isDeleteModalOpen}
        isButtonDisabled={isDeleteButtonDisabled}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
      />
    </Layout>
  );
};
