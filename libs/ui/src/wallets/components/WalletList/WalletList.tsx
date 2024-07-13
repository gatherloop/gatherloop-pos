import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { YStack } from 'tamagui';
import { useWalletListState } from './WalletList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Wallet } from '../../../../../api-contract/src';
import { MinusSquare } from '@tamagui/lucide-icons';

export type WalletListProps = {
  itemMenus: { title: string; onPress: (wallet: Wallet) => void }[];
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
            <ListItem
              key={wallet.id}
              title={wallet.name}
              subtitle={`Rp. ${wallet.balance.toLocaleString('id')}`}
              thumbnailSrc="https://picsum.photos/200/300"
              onPress={() => onItemPress(wallet)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(wallet),
              }))}
              footerItems={[
                {
                  value: `${wallet.paymentCostPercentage}%`,
                  icon: MinusSquare,
                },
              ]}
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
