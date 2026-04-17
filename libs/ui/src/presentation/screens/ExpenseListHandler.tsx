import { useRouter } from 'solito/router';
import {
  AuthLogoutUsecase,
  Expense,
  ExpenseDeleteUsecase,
  ExpenseListUsecase,
} from '../../domain';
import { ExpenseListScreen, ExpenseListScreenProps } from './ExpenseListScreen';
import { match, P } from 'ts-pattern';
import { useEffect } from 'react';
import {
  useAuthLogoutController,
  useExpenseDeleteController,
  useExpenseListController,
} from '../controllers';

export type ExpenseListHandlerProps = {
  authLogoutUsecase: AuthLogoutUsecase;
  expenseListUsecase: ExpenseListUsecase;
  expenseDeleteUsecase: ExpenseDeleteUsecase;
};

export const ExpenseListHandler = ({
  authLogoutUsecase,
  expenseListUsecase,
  expenseDeleteUsecase,
}: ExpenseListHandlerProps) => {
  const authLogout = useAuthLogoutController(authLogoutUsecase);
  const expenseList = useExpenseListController(expenseListUsecase);
  const expenseDelete = useExpenseDeleteController(expenseDeleteUsecase);
  const router = useRouter();

  useEffect(() => {
    match(expenseDelete.state)
      .with({ type: 'deletingSuccess' }, () => {
        expenseList.dispatch({ type: 'FETCH' });
      })
      .otherwise(() => {
        // noop
      });
  }, [expenseDelete.state, expenseList]);

  return (
    <ExpenseListScreen
      onLogoutPress={() => authLogout.dispatch({ type: 'LOGOUT' })}
      onEditMenuPress={(expense: Expense) =>
        router.push(`/expenses/${expense.id}`)
      }
      onItemPress={(expense: Expense) =>
        router.push(`/expenses/${expense.id}`)
      }
      onDeleteMenuPress={(expense: Expense) =>
        expenseDelete.dispatch({
          type: 'SHOW_CONFIRMATION',
          expenseId: expense.id,
        })
      }
      onEmptyActionPress={() => router.push('/expenses/create')}
      onRetryButtonPress={() => expenseList.dispatch({ type: 'FETCH' })}
      isRevalidating={expenseList.state.type === 'revalidating'}
      variant={match(expenseList.state)
        .returnType<ExpenseListScreenProps['variant']>()
        .with({ type: P.union('idle', 'loading') }, () => ({ type: 'loading' }))
        .with(
          { type: P.union('changingParams', 'loaded', 'revalidating') },
          () => ({ type: 'loaded' })
        )
        .with({ type: 'error' }, () => ({ type: 'error' }))
        .exhaustive()}
      expenses={expenseList.state.expenses}
      searchValue={expenseList.state.query}
      onSearchValueChange={(q: string) =>
        expenseList.dispatch({ type: 'CHANGE_PARAMS', query: q, page: 1 })
      }
      currentPage={expenseList.state.page}
      onPageChange={(page: number) =>
        expenseList.dispatch({ type: 'CHANGE_PARAMS', page })
      }
      totalItem={expenseList.state.totalItem}
      itemPerPage={expenseList.state.itemPerPage}
      wallets={expenseList.state.wallets}
      walletId={expenseList.state.walletId}
      onWalletIdChange={(walletId: number | null) =>
        expenseList.dispatch({ type: 'CHANGE_PARAMS', walletId, page: 1 })
      }
      budgets={expenseList.state.budgets}
      budgetId={expenseList.state.budgetId}
      onBudgetIdChange={(budgetId: number | null) =>
        expenseList.dispatch({ type: 'CHANGE_PARAMS', budgetId, page: 1 })
      }
      isDeleteModalOpen={match(expenseDelete.state.type)
        .with(
          P.union('shown', 'deleting', 'deletingError', 'deletingSuccess'),
          () => true
        )
        .otherwise(() => false)}
      isDeleteButtonDisabled={
        expenseDelete.state.type === 'deleting' ||
        expenseDelete.state.type === 'deletingSuccess'
      }
      onDeleteCancel={() =>
        expenseDelete.dispatch({ type: 'HIDE_CONFIRMATION' })
      }
      onDeleteButtonConfirmPress={() =>
        expenseDelete.dispatch({ type: 'DELETE' })
      }
    />
  );
};
