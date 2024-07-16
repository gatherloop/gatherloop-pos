// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  expenseList,
  expenseListQueryKey,
} from '../../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getExpenseListScreenDehydratedState =
  async (): Promise<DehydratedState> => {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
      queryKey: expenseListQueryKey(),
      queryFn: expenseList,
    });

    return dehydrate(queryClient);
  };
