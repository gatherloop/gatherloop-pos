import { useCallback, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionList } from '../../../../../api-contract/src';
import { PostMessageEvent, useDebounce, usePostMessage } from '../../../base';
import { useRouter } from 'solito/router';

export const useTransactionListState = () => {
  const router = useRouter();

  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useTransactionList({
    sortBy: 'created_at',
    order: 'desc',
    query,
  });

  const onReceiveMessage = useCallback(
    (event: PostMessageEvent) => {
      if (
        event.type === 'TransactionPaySuccess' ||
        event.type === 'TransactionDeleteSuccess'
      ) {
        refetch();
      }
    },
    [refetch]
  );

  const { postMessage } = usePostMessage(onReceiveMessage);

  const debounce = useDebounce();

  const handleSearchInputChange = (text: string) => {
    debounce(() => setQuery(text), 600);
  };

  return {
    transactions: data?.data ?? [],
    status,
    error,
    refetch,
    handleSearchInputChange,
    postMessage,
    router,
  };
};
