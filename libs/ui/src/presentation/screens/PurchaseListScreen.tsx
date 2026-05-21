import { Printer } from '@tamagui/lucide-icons';
import { Button } from 'tamagui';
import { Layout, PurchaseListView, PurchaseListViewProps } from '../components';
import { PurchaseTypeFilter } from '../../domain/entities/Material';

export type PurchaseListScreenProps = {
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  variant: PurchaseListViewProps['variant'];
  isRevalidating?: boolean;
  getMaterialEditUrl: (materialId: number) => string;
  purchaseTypeFilter: PurchaseTypeFilter;
  onPurchaseTypeFilterChange: (filter: PurchaseTypeFilter) => void;
  onPrintButtonPress: () => void;
};

export const PurchaseListScreen = ({
  onLogoutPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
  getMaterialEditUrl,
  purchaseTypeFilter,
  onPurchaseTypeFilterChange,
  onPrintButtonPress,
}: PurchaseListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Purchase List"
      rightActionItem={
        <Button
          size="$3"
          icon={Printer}
          variant="outlined"
          onPress={onPrintButtonPress}
        />
      }
    >
      <PurchaseListView
        variant={variant}
        onRetryButtonPress={onRetryButtonPress}
        isRevalidating={isRevalidating}
        getMaterialEditUrl={getMaterialEditUrl}
        purchaseTypeFilter={purchaseTypeFilter}
        onPurchaseTypeFilterChange={onPurchaseTypeFilterChange}
      />
    </Layout>
  );
};
