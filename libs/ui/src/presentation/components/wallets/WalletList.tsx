import { YStack } from 'tamagui';
import { WalletListItem } from './WalletListItem';
import { EmptyView, ErrorView, LoadingView } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Wallet } from '../../../domain';

export type WalletListProps = {
  onRetryButtonPress: () => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: Wallet[] };
  onEditMenuPress: (wallet: Wallet) => void;
  onTransferMenuPress: (wallet: Wallet) => void;
  onItemPress: (wallet: Wallet) => void;
};

export const WalletList = ({
  onRetryButtonPress,
  onEditMenuPress,
  onTransferMenuPress,
  onItemPress,
  variant,
}: WalletListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Wallets..." />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Wallet is Empty"
            subtitle="Please create a new product"
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
