import { match, P } from 'ts-pattern';
import { Budget, Expense, Wallet } from '../entities';
import {
  BudgetRepository,
  ExpenseRepository,
  WalletRepository,
} from '../repositories';
import { Usecase } from './IUsecase';
import { ExpenseListQueryRepository } from '../repositories/expenseListQuery';

type Context = {
  expenses: Expense[];
  errorMessage: string | null;
  page: number;
  itemPerPage: number;
  totalItem: number;
  query: string;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  walletId: number | null;
  wallets: Wallet[];
  budgetId: number | null;
  budgets: Budget[];
};

export type ExpenseListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type ExpenseListAction =
  | { type: 'FETCH' }
  | {
      type: 'FETCH_SUCCESS';
      expenses: Expense[];
      totalItem: number;
      wallets: Wallet[];
      budgets: Budget[];
    }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      query?: string;
      walletId?: number | null;
      budgetId?: number | null;
    }
  | { type: 'REVALIDATE'; expenses: Expense[]; totalItem: number }
  | { type: 'REVALIDATE_FINISH'; expenses: Expense[]; totalItem: number };

export type ExpenseListParams = {
  page?: number;
  itemPerPage?: number;
  totalItem: number;
  query?: string;
  expenses: Expense[];
  walletId?: number | null;
  wallets: Wallet[];
  budgetId?: number | null;
  budgets: Budget[];
  sortBy?: 'created_at';
  orderBy?: 'asc' | 'desc';
};

export class ExpenseListUsecase extends Usecase<
  ExpenseListState,
  ExpenseListAction,
  ExpenseListParams
> {
  params: ExpenseListParams;
  expenseRepository: ExpenseRepository;
  expenseListQueryRepository: ExpenseListQueryRepository;
  walletRepository: WalletRepository;
  budgetRepository: BudgetRepository;

  constructor(
    expenseRepository: ExpenseRepository,
    expenseListQueryRepository: ExpenseListQueryRepository,
    walletRepository: WalletRepository,
    budgetRepository: BudgetRepository,
    params: ExpenseListParams
  ) {
    super();
    this.expenseRepository = expenseRepository;
    this.expenseListQueryRepository = expenseListQueryRepository;
    this.walletRepository = walletRepository;
    this.budgetRepository = budgetRepository;
    this.params = params;
  }

  getInitialState() {
    const state: ExpenseListState = {
      type: this.params.expenses.length >= 1 ? 'loaded' : 'idle',
      page: this.params.page ?? this.expenseListQueryRepository.getPage(),
      itemPerPage:
        this.params.itemPerPage ??
        this.expenseListQueryRepository.getItemPerPage(),
      totalItem: this.params.totalItem,
      query:
        this.params.query ?? this.expenseListQueryRepository.getSearchQuery(),
      sortBy: this.params.sortBy ?? this.expenseListQueryRepository.getSortBy(),
      orderBy:
        this.params.orderBy ?? this.expenseListQueryRepository.getOrderBy(),
      errorMessage: null,
      expenses: this.params.expenses,
      walletId:
        this.params.walletId ?? this.expenseListQueryRepository.getWalletId(),
      wallets: this.params.wallets,
      budgetId:
        this.params.budgetId ?? this.expenseListQueryRepository.getBudgetId(),
      budgets: this.params.budgets,
    } as const;

    return state;
  }

  getNextState(state: ExpenseListState, action: ExpenseListAction) {
    return match([state, action])
      .returnType<ExpenseListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { expenses, totalItem, budgets, wallets }]) => ({
          ...state,
          type: 'loaded',
          expenses,
          totalItem,
          budgets,
          wallets,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
      }))
      .with(
        [
          {
            type: P.union(
              'loaded',
              'changingParams',
              'loading',
              'error',
              'revalidating'
            ),
          },
          { type: P.union('CHANGE_PARAMS') },
        ],
        ([state, { type: _type, ...params }]) => ({
          ...state,
          ...params,
          type: 'changingParams',
        })
      )
      .with([{ type: 'changingParams' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'changingParams' }, { type: 'REVALIDATE' }],
        ([state, { expenses, totalItem }]) => ({
          ...state,
          expenses,
          totalItem,
          type: 'revalidating',
        })
      )
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { type: _type, ...params }]) => ({
          ...state,
          ...params,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: ExpenseListState,
    dispatch: (action: ExpenseListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ query, page, itemPerPage, sortBy, orderBy, budgetId, walletId }) =>
          Promise.all([
            this.expenseRepository.fetchExpenseList({
              query,
              page,
              itemPerPage,
              sortBy,
              orderBy,
              budgetId,
              walletId,
            }),
            this.walletRepository.fetchWalletList(),
            this.budgetRepository.fetchBudgetList(),
          ])
            .then(([{ expenses, totalItem }, wallets, budgets]) =>
              dispatch({
                type: 'FETCH_SUCCESS',
                expenses,
                totalItem,
                wallets,
                budgets,
              })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch expenses',
              })
            )
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, orderBy, query, sortBy, walletId, budgetId }) => {
          this.expenseListQueryRepository.setPage(page);
          this.expenseListQueryRepository.setSearchQuery(query);
          this.expenseListQueryRepository.setOrderBy(orderBy);
          this.expenseListQueryRepository.setSortBy(sortBy);
          this.expenseListQueryRepository.setItemPerPage(itemPerPage);
          this.expenseListQueryRepository.setWalletId(walletId);
          this.expenseListQueryRepository.setBudgetId(budgetId);

          const { expenses, totalItem } = this.expenseRepository.getExpenseList(
            {
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
              walletId,
              budgetId,
            }
          );

          if (expenses.length > 0) {
            dispatch({ type: 'REVALIDATE', expenses, totalItem });
          } else {
            dispatch({ type: 'FETCH' });
          }
        }
      )
      .with(
        { type: 'revalidating' },
        ({
          expenses,
          totalItem,
          query,
          page,
          itemPerPage,
          sortBy,
          orderBy,
          walletId,
          budgetId,
        }) => {
          this.expenseRepository
            .fetchExpenseList({
              query,
              page,
              itemPerPage,
              sortBy,
              orderBy,
              walletId,
              budgetId,
            })
            .then(({ expenses, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', expenses, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', expenses, totalItem })
            );
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
