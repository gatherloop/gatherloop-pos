import { Printer } from '@tamagui/lucide-icons';
import { Button, Tooltip } from 'tamagui';
import { Layout, PurchaseListView, PurchaseListViewProps } from '../components';

export type PurchaseListScreenProps = {
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  variant: PurchaseListViewProps['variant'];
  isRevalidating?: boolean;
  getMaterialEditUrl?: (materialId: number) => string;
};

export const PurchaseListScreen = ({
  onLogoutPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
  getMaterialEditUrl,
}: PurchaseListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Purchase List"
      rightActionItem={
        <Tooltip>
          <Tooltip.Trigger asChild>
            <Button
              size="$3"
              icon={Printer}
              variant="outlined"
              disabled
              opacity={0.5}
            />
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Tooltip.Arrow />
            Print — coming soon
          </Tooltip.Content>
        </Tooltip>
      }
    >
      <PurchaseListView
        variant={variant}
        onRetryButtonPress={onRetryButtonPress}
        isRevalidating={isRevalidating}
        getMaterialEditUrl={getMaterialEditUrl}
      />
    </Layout>
  );
};
