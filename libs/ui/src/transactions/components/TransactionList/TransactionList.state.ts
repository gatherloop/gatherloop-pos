import { useMemo, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionList } from '../../../../../api-contract/src';
import { Event, Listener, useDebounce, useEventEmitter } from '../../../base';
import { useRouter } from 'solito/router';

export const useTransactionListState = () => {
  const router = useRouter();

  const [query, setQuery] = useState('');

  const { data, status, error, refetch } = useTransactionList({
    sortBy: 'created_at',
    order: 'desc',
    query,
  });

  const listeners = useMemo<Listener<Event['type']>[]>(
    () => [
      {
        type: 'TransactionDeleteSuccess',
        callback: () => refetch(),
      },
      {
        type: 'TransactionPaySuccess',
        callback: () => refetch(),
      },
    ],
    [refetch]
  );

  const { emit } = useEventEmitter(listeners);

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
    emit,
    router,
  };
};
