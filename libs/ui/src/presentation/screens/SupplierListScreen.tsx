import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { SupplierDeleteAlert, SupplierList, Layout } from '../components';
import {
  AuthLogoutUsecase,
  Supplier,
  SupplierDeleteUsecase,
  SupplierListUsecase,
} from '../../domain';
import {
  useAuthLogoutController,
  useSupplierDeleteController,
  useSupplierListController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

export type SupplierListScreenProps = {
  supplierListUsecase: SupplierListUsecase;
  supplierDeleteUsecase: SupplierDeleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const SupplierListScreen = (props: SupplierListScreenProps) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const supplierListController = useSupplierListController(
    props.supplierListUsecase
  );
  const supplierDeleteController = useSupplierDeleteController(
    props.supplierDeleteUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (supplierDeleteController.state.type === 'deletingSuccess')
      supplierListController.dispatch({ type: 'FETCH' });
  }, [supplierDeleteController.state.type, supplierListController]);

  const onOpenMapMenuPress = (supplier: Supplier) => {
    router.push(supplier.mapsLink);
  };

  const onEditMenuPress = (supplier: Supplier) => {
    router.push(`/suppliers/${supplier.id}`);
  };

  const onItemPress = (supplier: Supplier) => {
    router.push(`/suppliers/${supplier.id}`);
  };

  const onDeleteMenuPress = (supplier: Supplier) => {
    supplierDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      supplierId: supplier.id,
    });
  };

  return (
    <Layout
      {...authLogoutController}
      title="Suppliers"
      rightActionItem={
        <Link href="/suppliers/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <SupplierList
        {...supplierListController}
        onOpenMapMenuPress={onOpenMapMenuPress}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <SupplierDeleteAlert {...supplierDeleteController} />
    </Layout>
  );
};
