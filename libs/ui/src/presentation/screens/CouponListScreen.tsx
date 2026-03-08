import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { CouponDeleteAlert, CouponList, Layout } from '../components';
import type { CouponListProps } from '../components';
import { Coupon } from '../../domain';

export type CouponListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (coupon: Coupon) => void;
  onDeleteMenuPress: (coupon: Coupon) => void;
  onItemPress: (coupon: Coupon) => void;
  onRetryButtonPress: () => void;
  variant: CouponListProps['variant'];
  isDeleteModalOpen: boolean;
  isDeleteButtonDisabled: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
};

export const CouponListScreen = ({
  onLogoutPress,
  onEditMenuPress,
  onDeleteMenuPress,
  onItemPress,
  onRetryButtonPress,
  variant,
  isDeleteModalOpen,
  isDeleteButtonDisabled,
  onDeleteCancel,
  onDeleteConfirm,
}: CouponListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Coupons"
      rightActionItem={
        <Link href="/coupons/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <CouponList
        onRetryButtonPress={onRetryButtonPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onItemPress={onItemPress}
        variant={variant}
      />
      <CouponDeleteAlert
        isOpen={isDeleteModalOpen}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
        isButtonDisabled={isDeleteButtonDisabled}
      />
    </Layout>
  );
};
