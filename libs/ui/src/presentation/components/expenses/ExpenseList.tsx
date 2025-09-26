import { EmptyView, ErrorView, LoadingView, Pagination } from '../base';
import {
  Button,
  Input,
  Label,
  Paragraph,
  Popover,
  RadioGroup,
  Separator,
  XStack,
  YStack,
} from 'tamagui';
import { FlatList } from 'react-native';
import { ExpenseListItem } from './ExpenseListItem';
import { Budget, Expense, Wallet } from '../../../domain';
import { Filter } from '@tamagui/lucide-icons';

export type ExpenseListProps = {
  onRetryButtonPress: () => void;
  onEditMenuPress: (expense: Expense) => void;
  onDeleteMenuPress: (expense: Expense) => void;
  onItemPress: (expense: Expense) => void;
  variant: { type: 'loading' } | { type: 'error' } | { type: 'loaded' };
  expenses: Expense[];
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalItem: number;
  itemPerPage: number;
  wallets: Wallet[];
  walletId: number | null;
  onWalletIdChange: (walletId: number | null) => void;
  budgets: Budget[];
  budgetId: number | null;
  onBudgetIdChange: (budgetId: number | null) => void;
};

export const ExpenseList = ({
  budgetId,
  budgets,
  onBudgetIdChange,
  currentPage,
  itemPerPage,
  expenses,
  onPageChange,
  onSearchValueChange,
  searchValue,
  totalItem,
  walletId,
  wallets,
  onWalletIdChange,
  onRetryButtonPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  variant,
}: ExpenseListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      <XStack gap="$3" justifyContent="space-between" alignItems="center">
        <Input
          id="search"
          placeholder="Search Item Name"
          defaultValue={searchValue}
          onChangeText={onSearchValueChange}
          flex={1}
        />

        <Popover size="$5" allowFlip stayInFrame offset={15}>
          <Popover.Trigger asChild>
            <Button icon={Filter}>Filter</Button>
          </Popover.Trigger>

          <Popover.Content
            borderWidth={1}
            borderColor="$borderColor"
            width={300}
            height={200}
            enterStyle={{ y: -10, opacity: 0 }}
            exitStyle={{ y: -10, opacity: 0 }}
            elevate
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
          >
            <Popover.Arrow borderWidth={1} borderColor="$borderColor" />

            <YStack gap="$3">
              <YStack>
                <Paragraph>Wallet</Paragraph>

                <RadioGroup
                  value={walletId === null ? 'all' : walletId.toString()}
                  onValueChange={(value) =>
                    onWalletIdChange(value === 'all' ? null : parseInt(value))
                  }
                >
                  <XStack gap="$3" flexWrap="wrap">
                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="all" id="all-wallet">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>

                      <Label htmlFor="all-wallet">All</Label>
                    </XStack>

                    {wallets.map((wallet) => (
                      <XStack gap="$2" alignItems="center">
                        <RadioGroup.Item
                          value={wallet.id.toString()}
                          id={`wallet-${wallet.id.toString()}`}
                        >
                          <RadioGroup.Indicator />
                        </RadioGroup.Item>

                        <Label htmlFor={`wallet-${wallet.id.toString()}`}>
                          {wallet.name}
                        </Label>
                      </XStack>
                    ))}
                  </XStack>
                </RadioGroup>
              </YStack>

              <Separator />

              <YStack>
                <Paragraph>Budget</Paragraph>

                <RadioGroup
                  value={budgetId === null ? 'all' : budgetId.toString()}
                  onValueChange={(value) =>
                    onBudgetIdChange(value === 'all' ? null : parseInt(value))
                  }
                >
                  <XStack gap="$3" flexWrap="wrap">
                    <XStack gap="$2" alignItems="center">
                      <RadioGroup.Item value="all" id="all-budget">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>

                      <Label htmlFor="all-budget">All</Label>
                    </XStack>

                    {budgets.map((budget) => (
                      <XStack gap="$2" alignItems="center">
                        <RadioGroup.Item
                          value={budget.id.toString()}
                          id={`budget-${budget.id.toString()}`}
                        >
                          <RadioGroup.Indicator />
                        </RadioGroup.Item>

                        <Label htmlFor={`budget-${budget.id.toString()}`}>
                          {budget.name}
                        </Label>
                      </XStack>
                    ))}
                  </XStack>
                </RadioGroup>
              </YStack>
            </YStack>
          </Popover.Content>
        </Popover>
      </XStack>
      {variant.type === 'loading' ? (
        <LoadingView title="Fetching Expenses..." />
      ) : variant.type === 'loaded' ? (
        expenses.length > 0 ? (
          <>
            <FlatList
              nestedScrollEnabled
              data={expenses}
              renderItem={({ item }) => (
                <ExpenseListItem
                  budgetName={item.budget.name}
                  createdAt={item.createdAt}
                  total={item.total}
                  walletName={item.wallet.name}
                  onEditMenuPress={() => onEditMenuPress(item)}
                  onDeleteMenuPress={() => onDeleteMenuPress(item)}
                  onPress={() => onItemPress(item)}
                />
              )}
              ItemSeparatorComponent={() => <YStack height="$1" />}
            />
            <Pagination
              currentPage={currentPage}
              onChangePage={onPageChange}
              totalItem={totalItem}
              itemPerPage={itemPerPage}
            />
          </>
        ) : (
          <EmptyView
            title="Oops, Expense is Empty"
            subtitle="Please create a new expense"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Expenses"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={onRetryButtonPress}
        />
      )}
    </YStack>
  );
};
