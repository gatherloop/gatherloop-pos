import { Spinner, YStack } from 'tamagui';
import { EmptyView, ErrorView, SkeletonList } from '../base';
import { FlatList } from 'react-native';
import { WalletTransferListItem, WalletTransferListItemProps } from '..';

export type WalletTransferListProps = {
  onRetryButtonPress: () => void;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'loaded'; items: WalletTransferListItemProps[] }
    | { type: 'error' };
};

export const WalletTransferList = ({
  variant,
  onRetryButtonPress,
  isRevalidating,
}: WalletTransferListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {isRevalidating && <Spinner size="small" alignSelf="flex-end" />}
      {variant.type === 'loading' ? (
        <SkeletonList />
      ) : variant.type === 'loaded' ? (
        variant.items.length > 0 ? (
          <FlatList
            data={variant.items}
            renderItem={({ item }) => <WalletTransferListItem {...item} />}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ) : (
          <EmptyView
            title="Oops, Transfer History is Empty"
            subtitle="Please create a new transfer"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Transfer Histories"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={onRetryButtonPress}
        />
      )}
    </YStack>
  );
};
