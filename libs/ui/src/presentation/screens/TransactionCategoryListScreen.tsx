import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  TransactionCategoryDeleteAlert,
  TransactionCategoryList,
  Layout,
} from '../components';
import {
  AuthLogoutUsecase,
  TransactionCategory,
  TransactionCategoryDeleteUsecase,
  TransactionCategoryListUsecase,
} from '../../domain';
import {
  useAuthLogoutController,
  useTransactionCategoryDeleteController,
  useTransactionCategoryListController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

export type TransactionCategoryListScreenProps = {
  transactionCategoryListUsecase: TransactionCategoryListUsecase;
  transactionCategoryDeleteUsecase: TransactionCategoryDeleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const TransactionCategoryListScreen = (
  props: TransactionCategoryListScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const transactionCategoryListController =
    useTransactionCategoryListController(props.transactionCategoryListUsecase);
  const transactionCategoryDeleteController =
    useTransactionCategoryDeleteController(
      props.transactionCategoryDeleteUsecase
    );

  const router = useRouter();

  useEffect(() => {
    if (transactionCategoryDeleteController.state.type === 'deletingSuccess')
      transactionCategoryListController.dispatch({ type: 'FETCH' });
  }, [
    transactionCategoryDeleteController.state.type,
    transactionCategoryListController,
  ]);

  const onEditMenuPress = (transactionCategory: TransactionCategory) => {
    router.push(`/transaction-categories/${transactionCategory.id}`);
  };

  const onItemPress = (transactionCategory: TransactionCategory) => {
    router.push(`/transaction-categories/${transactionCategory.id}`);
  };

  const onDeleteMenuPress = (transactionCategory: TransactionCategory) => {
    transactionCategoryDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      transactionCategoryId: transactionCategory.id,
    });
  };

  return (
    <Layout
      {...authLogoutController}
      title="Transaction Categories"
      rightActionItem={
        <Link href="/transaction-categories/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <TransactionCategoryList
        {...transactionCategoryListController}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <TransactionCategoryDeleteAlert
        {...transactionCategoryDeleteController}
      />
    </Layout>
  );
};
