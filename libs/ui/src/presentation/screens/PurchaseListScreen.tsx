import { useState } from 'react';
import { Printer } from '@tamagui/lucide-icons';
import { Button, Tooltip, XStack } from 'tamagui';
import { Layout, PurchaseListView, PurchaseListViewProps } from '../components';
import { StoreTypeFilter } from '../components/purchaseLists/PurchaseListView';

export type PurchaseListScreenProps = {
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  variant: PurchaseListViewProps['variant'];
  isRevalidating?: boolean;
};

const FILTER_OPTIONS: { label: string; value: StoreTypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
];

export const PurchaseListScreen = ({
  onLogoutPress,
  onRetryButtonPress,
  variant,
  isRevalidating,
}: PurchaseListScreenProps) => {
  const [storeTypeFilter, setStoreTypeFilter] = useState<StoreTypeFilter>('all');

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
            theme={storeTypeFilter === option.value ? 'blue' : undefined}
            variant={storeTypeFilter === option.value ? undefined : 'outlined'}
            onPress={() => setStoreTypeFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </XStack>
      <PurchaseListView
        variant={variant}
        onRetryButtonPress={onRetryButtonPress}
        isRevalidating={isRevalidating}
        storeTypeFilter={storeTypeFilter}
      />
    </Layout>
  );
};
