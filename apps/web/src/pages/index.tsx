import {
  ApiBudgetRepository,
  ApiExpenseRepository,
  ApiTransactionRepository,
  getUrlFromCtx,
  DashboardApp,
  DashboardAppProps,
  UrlExpenseStatisticListQueryRepository,
  UrlTransactionStatisticListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  DashboardAppProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const url = getUrlFromCtx(ctx);
  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const transactionStatisticListQueryRepository =
    new UrlTransactionStatisticListQueryRepository();
  const expenseRepository = new ApiExpenseRepository(client);
  const expenseStatisticListQueryRepository =
    new UrlExpenseStatisticListQueryRepository();
  const budgetRepository = new ApiBudgetRepository(client);

  const groupBy = transactionStatisticListQueryRepository.getGroupBy(url);
  const preset = transactionStatisticListQueryRepository.getPreset(url);
  const startDate = transactionStatisticListQueryRepository.getStartDate(url);
  const endDate = transactionStatisticListQueryRepository.getEndDate(url);
  const transactionStatistics =
    await transactionRepository.fetchTransactionStatisticList(
      { groupBy, startDate, endDate },
      { headers: { Cookie: ctx.req.headers.cookie } }
    );

  const expenseView = expenseStatisticListQueryRepository.getView(url);
  const expenseGroupBy = expenseStatisticListQueryRepository.getGroupBy(url);
  const expensePreset = expenseStatisticListQueryRepository.getPreset(url);
  const expenseStartDate =
    expenseStatisticListQueryRepository.getStartDate(url);
  const expenseEndDate = expenseStatisticListQueryRepository.getEndDate(url);
  const expenseStatistics =
    await expenseRepository.fetchExpenseStatisticList(
      {
        groupBy: expenseGroupBy,
        startDate: expenseStartDate,
        endDate: expenseEndDate,
      },
      { headers: { Cookie: ctx.req.headers.cookie } }
    );

  // Revenue for the same period as the expense widget, powering its target
  // vs. actual variance report.
  const expenseRevenueStatistics =
    await transactionRepository.fetchTransactionStatisticList(
      {
        groupBy: expenseGroupBy,
        startDate: expenseStartDate,
        endDate: expenseEndDate,
      },
      { headers: { Cookie: ctx.req.headers.cookie } }
    );
  const budgets = await budgetRepository.fetchBudgetList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: {
      transactionStatisticListParams: {
        transactionStatistics,
        groupBy,
        preset,
        startDate,
        endDate,
      },
      expenseStatisticListParams: {
        expenseStatistics,
        view: expenseView,
        groupBy: expenseGroupBy,
        preset: expensePreset,
        startDate: expenseStartDate,
        endDate: expenseEndDate,
      },
      expenseRevenueStatisticListParams: {
        transactionStatistics: expenseRevenueStatistics,
        groupBy: expenseGroupBy,
        preset: expensePreset,
        startDate: expenseStartDate,
        endDate: expenseEndDate,
      },
      budgetListParams: { budgets },
    },
  };
};

export default DashboardApp;
