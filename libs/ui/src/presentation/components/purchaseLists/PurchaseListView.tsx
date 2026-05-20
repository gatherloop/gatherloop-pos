import { Button, H4, Paragraph, Separator, Spinner, XStack, YStack } from 'tamagui';
import { match } from 'ts-pattern';
import { ScrollView } from 'react-native';
import { EmptyView, ErrorView, SkeletonList } from '../base';
import { PurchaseList } from '../../../domain';
import { PurchaseTypeFilter } from '../../../domain/entities/Material';
import { PurchaseListGroupedView } from './PurchaseListGroupedView';

const FILTER_OPTIONS: { value: PurchaseTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'delivery', label: 'Delivery' },
];

export type PurchaseListViewProps = {
  onRetryButtonPress: () => void;
  isRevalidating?: boolean;
  getMaterialEditUrl: (materialId: number) => string;
  purchaseTypeFilter: PurchaseTypeFilter;
  onPurchaseTypeFilterChange: (filter: PurchaseTypeFilter) => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty'; stockCheckDate: string; totalEstimatedCost: number }
    | { type: 'loaded'; purchaseList: PurchaseList };
};

export const PurchaseListView = ({
  onRetryButtonPress,
  isRevalidating,
  getMaterialEditUrl,
  purchaseTypeFilter,
  onPurchaseTypeFilterChange,
  variant,
}: PurchaseListViewProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {isRevalidating && (
        <YStack alignItems="center">
          <Spinner size="small" color="$gray10" />
        </YStack>
      )}

      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, ({ stockCheckDate, totalEstimatedCost }) => (
          <YStack gap="$3">
            <PurchaseListHeader
              stockCheckDate={stockCheckDate}
              totalEstimatedCost={totalEstimatedCost}
            />
            <EmptyView
              title="Nothing to Restock"
              subtitle="Everything is above its minimum — no purchases needed."
            />
          </YStack>
        ))
        .with({ type: 'loaded' }, ({ purchaseList }) => {
          const filteredTotalEstimatedCost =
            purchaseTypeFilter === 'all'
              ? purchaseList.totalEstimatedCost
              : purchaseList.items
                  .filter((item) =>
                    item.suppliers.some(
                      (s) => s.purchaseType === purchaseTypeFilter
                    )
                  )
                  .reduce((sum, item) => sum + item.estimatedCost, 0);
          return (
          <YStack gap="$3" flex={1}>
            <PurchaseListHeader
              stockCheckDate={purchaseList.stockCheckDate}
              totalEstimatedCost={filteredTotalEstimatedCost}
            />
            <PurchaseTypeFilterControl
              purchaseTypeFilter={purchaseTypeFilter}
              onPurchaseTypeFilterChange={onPurchaseTypeFilterChange}
            />
            <ScrollView nestedScrollEnabled>
              <PurchaseListGroupedView
                purchaseList={purchaseList}
                getMaterialEditUrl={getMaterialEditUrl}
                purchaseTypeFilter={purchaseTypeFilter}
              />
            </ScrollView>
          </YStack>
          );
        })
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Purchase List"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}
    </YStack>
  );
};

function PurchaseTypeFilterControl({
  purchaseTypeFilter,
  onPurchaseTypeFilterChange,
}: {
  purchaseTypeFilter: PurchaseTypeFilter;
  onPurchaseTypeFilterChange: (filter: PurchaseTypeFilter) => void;
}) {
  return (
    <XStack gap="$2" flexWrap="wrap">
      {FILTER_OPTIONS.map(({ value, label }) => (
        <Button
          key={value}
          size="$3"
          onPress={() => onPurchaseTypeFilterChange(value)}
          variant={purchaseTypeFilter === value ? undefined : 'outlined'}
        >
          {label}
        </Button>
      ))}
    </XStack>
  );
}

function PurchaseListHeader({
  stockCheckDate,
  totalEstimatedCost,
}: {
  stockCheckDate: string;
  totalEstimatedCost: number;
}) {
  const date = new Date(stockCheckDate).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <YStack gap="$2">
      <H4>Purchase list for closing count of {date}</H4>
      <Separator />
      <Paragraph size="$5" fontWeight="bold">
        Total Estimated Cost: Rp. {totalEstimatedCost.toLocaleString('id')}
      </Paragraph>
      <Separator />
    </YStack>
  );
}
