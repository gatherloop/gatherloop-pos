import { useState } from 'react';
import { Printer } from '@tamagui/lucide-icons';
import { Button, Tooltip, XStack } from 'tamagui';
import { Layout, PurchaseListView, PurchaseListViewProps } from '../components';
import { PurchaseTypeFilter } from '../components/purchaseLists/PurchaseListView';

export type PurchaseListScreenProps = {
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  variant: PurchaseListViewProps['variant'];
  isRevalidating?: boolean;
};

const FILTER_OPTIONS: { label: string; value: PurchaseTypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Offline', value: 'offline' },
  { label: 'Online', value: 'online' },
  { label: 'Delivery', value: 'delivery' },
];

export const PurchaseListScreen = ({
  onLogoutPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
}: PurchaseListScreenProps) => {
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<PurchaseTypeFilter>('all');

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
      <XStack gap="$2" paddingBottom="$2">
        {FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="$2"
            theme={purchaseTypeFilter === option.value ? 'blue' : undefined}
            variant={purchaseTypeFilter === option.value ? undefined : 'outlined'}
            onPress={() => setPurchaseTypeFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </XStack>
      <PurchaseListView
        variant={variant}
        onRetryButtonPress={onRetryButtonPress}
        isRevalidating={isRevalidating}
        purchaseTypeFilter={purchaseTypeFilter}
      />
    </Layout>
  );
};
