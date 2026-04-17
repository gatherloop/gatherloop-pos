import { EmptyView, ErrorView, SkeletonList } from '../base';
import { Spinner, YStack } from 'tamagui';
import { FlatList } from 'react-native';
import { CalculationListItem } from './CalculationListItem';
import { Calculation } from '../../../domain';

export type CalculationListProps = {
  onRetryButtonPress: () => void;
  onEditMenuPress: (calculation: Calculation) => void;
  onDeleteMenuPress: (calculation: Calculation) => void;
  onCompleteMenuPress: (calculation: Calculation) => void;
  onItemPress: (calculation: Calculation) => void;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'loaded'; items: Calculation[] };
};

export const CalculationList = ({
  onRetryButtonPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onCompleteMenuPress,
  onItemPress,
  isRevalidating,
  variant,
}: CalculationListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {isRevalidating && <Spinner size="small" alignSelf="flex-end" />}
      {variant.type === 'loading' ? (
        <SkeletonList />
      ) : variant.type === 'loaded' ? (
        variant.items.length > 0 ? (
          <FlatList
            nestedScrollEnabled
            data={variant.items}
            renderItem={({ item }) => (
              <CalculationListItem
                createdAt={item.createdAt}
                completedAt={item.completedAt}
                totalCalculation={item.totalCalculation}
                totalWallet={item.totalWallet}
                walletName={item.wallet.name}
                onEditMenuPress={() => onEditMenuPress(item)}
                onDeleteMenuPress={() => onDeleteMenuPress(item)}
                onCompleteMenuPress={() => onCompleteMenuPress(item)}
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ) : (
          <EmptyView
            title="Oops, Calculation is Empty"
            subtitle="Please create a new calculation"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Calculations"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={onRetryButtonPress}
        />
      )}
    </YStack>
  );
};
