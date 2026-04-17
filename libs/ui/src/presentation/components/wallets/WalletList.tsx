import { Spinner, YStack } from 'tamagui';
import { WalletListItem } from './WalletListItem';
import { EmptyView, ErrorView, SkeletonList } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Wallet } from '../../../domain';

export type WalletListProps = {
  onRetryButtonPress: () => void;
  isRevalidating?: boolean;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: Wallet[] };
  onEditMenuPress: (wallet: Wallet) => void;
  onTransferMenuPress: (wallet: Wallet) => void;
  onItemPress: (wallet: Wallet) => void;
  onEmptyActionPress?: () => void;
};

export const WalletList = ({
  onRetryButtonPress,
  isRevalidating,
  onEditMenuPress,
  onTransferMenuPress,
  onItemPress,
  variant,
  onEmptyActionPress,
}: WalletListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {isRevalidating && <Spinner size="small" alignSelf="flex-end" />}
      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Wallet is Empty"
            subtitle="Please create a new wallet"
            actionLabel="Create Wallet"
            onActionPress={onEmptyActionPress}
          />
        ))
        .with({ type: 'loaded' }, ({ items }) => (
          <FlatList
            nestedScrollEnabled
            data={items}
            renderItem={({ item }) => (
              <WalletListItem
                balance={item.balance}
                name={item.name}
                paymentCostPercentage={item.paymentCostPercentage}
                onEditMenuPress={() => onEditMenuPress(item)}
                onTransferMenuPress={() => onTransferMenuPress(item)}
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Wallets"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}
    </YStack>
  );
};
