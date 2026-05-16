import { H4, Paragraph, Separator, Spinner, YStack } from 'tamagui';
import { match } from 'ts-pattern';
import { FlatList } from 'react-native';
import { PurchaseListItemView } from './PurchaseListItemView';
import { EmptyView, ErrorView, SkeletonList } from '../base';
import { PurchaseList } from '../../../domain';

export type PurchaseListViewProps = {
  onRetryButtonPress: () => void;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty'; stockCheckDate: string; totalEstimatedCost: number }
    | { type: 'loaded'; purchaseList: PurchaseList };
};

export const PurchaseListView = ({
  onRetryButtonPress,
  isRevalidating,
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
        .with({ type: 'loaded' }, ({ purchaseList }) => (
          <YStack gap="$3" flex={1}>
            <PurchaseListHeader
              stockCheckDate={purchaseList.stockCheckDate}
              totalEstimatedCost={purchaseList.totalEstimatedCost}
            />
            <FlatList
              nestedScrollEnabled
              data={purchaseList.items}
              renderItem={({ item }) => <PurchaseListItemView item={item} />}
              ItemSeparatorComponent={() => <YStack height="$1" />}
            />
          </YStack>
        ))
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
