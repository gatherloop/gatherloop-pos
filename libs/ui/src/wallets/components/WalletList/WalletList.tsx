import { EmptyView, ErrorView, ListItemMenu, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { useWalletListState } from './WalletList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Wallet } from '../../../../../api-contract/src';
import { WalletCard } from '../WalletCard';

export type WalletListProps = {
  itemMenus: (Omit<ListItemMenu, 'onPress' | 'isShown'> & {
    onPress: (wallet: Wallet) => void;
    isShown?: (wallet: Wallet) => void;
  })[];
  onItemPress: (wallet: Wallet) => void;
};

export const WalletList = ({ itemMenus, onItemPress }: WalletListProps) => {
  const { wallets, refetch, status } = useWalletListState();
  return (
    <YStack gap="$3">
      {status === 'pending' ? (
        <LoadingView title="Fetching Wallets..." />
      ) : status === 'success' ? (
        wallets.length > 0 ? (
          wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              name={wallet.name}
              balance={wallet.balance}
              paymentCostPercentage={wallet.paymentCostPercentage}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(wallet),
                isShown: () =>
                  itemMenu.isShown ? itemMenu.isShown(wallet) : true,
              }))}
              onPress={() => onItemPress(wallet)}
            />
          ))
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
