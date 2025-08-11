import { YStack } from 'tamagui';
import { CouponListItem } from './CouponListItem';
import { EmptyView, ErrorView, LoadingView } from '../base';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { Coupon } from '../../../domain';

export type CouponListProps = {
  onRetryButtonPress: () => void;
  onDeleteMenuPress: (coupon: Coupon) => void;
  onEditMenuPress: (coupon: Coupon) => void;
  onItemPress: (coupon: Coupon) => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; coupons: Coupon[] };
};

export const CouponList = ({
  onRetryButtonPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  variant,
}: CouponListProps) => {
  return (
    <YStack gap="$3" flex={1}>
      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Coupons..." />
        ))
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Coupon is Empty"
            subtitle="Please create a new coupon"
          />
        ))
        .with({ type: 'loaded' }, ({ coupons }) => (
          <FlatList
            nestedScrollEnabled
            data={coupons}
            renderItem={({ item }) => (
              <CouponListItem
                code={item.code}
                amount={item.amount}
                type={item.type}
                onDeleteMenuPress={() => onDeleteMenuPress(item)}
                onEditMenuPress={() => onEditMenuPress(item)}
                onPress={() => onItemPress(item)}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Coupons"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .otherwise(() => null)}
    </YStack>
  );
};
