import { EmptyView, ErrorView, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { useWalletListState } from './WalletList.state';
import { WalletListItem } from '../WalletListItem';
import { FlatList } from 'react-native';

export const WalletList = () => {
  const { wallets, refetch, status, onEditMenuPress, onTransferMenuPress } = useWalletListState();
  return (
    <YStack gap="$3" flex={1}>
      {status === 'pending' ? (
        <LoadingView title="Fetching Wallets..." />
      ) : status === 'success' ? (
        wallets.length > 0 ? (
          <FlatList
            data={wallets}
            renderItem={({ item: wallet }) => (
              <WalletListItem
                key={wallet.id}
                name={wallet.name}
                balance={wallet.balance}
                paymentCostPercentage={wallet.paymentCostPercentage}
                onTransferMenuPress={() => onTransferMenuPress(wallet)}
                onEditMenuPress={() => onEditMenuPress(wallet)}
                onPress={() => onEditMenuPress(wallet)}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ) : (
          <EmptyView
            title="Oops, Wallet is Empty"
            subtitle="Please create a new wallet"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Wallets"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={refetch}
        />
      )}
    </YStack>
  );
};
