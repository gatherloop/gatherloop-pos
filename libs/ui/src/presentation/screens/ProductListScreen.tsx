import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  ProductDeleteAlert,
  ProductList,
  Layout,
  ProductListProps,
} from '../components';
import { Product, SaleType } from '../../domain';

export type ProductListScreenProps = {
  onLogoutPress: () => void;
  onEditMenuPress: (product: Product) => void;
  onDeleteMenuPress: (product: Product) => void;
  onItemPress: (product: Product) => void;
  currentPage: number;
  itemPerPage: number;
  totalItem: number;
  onPageChange: (page: number) => void;
  onRetryButtonPress: () => void;
  onSaleTypeChange: (saleType: SaleType) => void;
  onSearchValueChange: (value: string) => void;
  saleType: SaleType;
  searchValue: string;
  variant: ProductListProps['variant'];
  isDeleteButtonDisabled: boolean;
  isDeleteModalOpen: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  isRevalidating?: boolean;
};

export const ProductListScreen = ({
  onLogoutPress,
  onDeleteMenuPress,
  onEditMenuPress,
  onItemPress,
  currentPage,
  isDeleteButtonDisabled,
  isDeleteModalOpen,
  itemPerPage,
  onDeleteCancel,
  onDeleteConfirm,
  onPageChange,
  onRetryButtonPress,
  onSaleTypeChange,
  onSearchValueChange,
  saleType,
  searchValue,
  totalItem,
  variant,
  isRevalidating,
}: ProductListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Products"
      rightActionItem={
        <Link href="/products/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <ProductList
        currentPage={currentPage}
        itemPerPage={itemPerPage}
        onPageChange={onPageChange}
        onRetryButtonPress={onRetryButtonPress}
        onSaleTypeChange={onSaleTypeChange}
        onSearchValueChange={onSearchValueChange}
        saleType={saleType}
        searchValue={searchValue}
        totalItem={totalItem}
        variant={variant}
        isRevalidating={isRevalidating}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <ProductDeleteAlert
        isButtonDisabled={isDeleteButtonDisabled}
        isOpen={isDeleteModalOpen}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
      />
    </Layout>
  );
};
