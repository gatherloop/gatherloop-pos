import { YStack } from 'tamagui';
import { WalletListItem, WalletListItemProps } from '../../components';
import { EmptyView, ErrorView, LoadingView } from '../../../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';

export type WalletListViewProps = {
  onRetryButtonPress: () => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: WalletListItemProps[] };
};

export const WalletListView = ({
  onRetryButtonPress,
  variant,
}: WalletListViewProps) => {
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
            renderItem={({ item }) => <WalletListItem {...item} />}
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
