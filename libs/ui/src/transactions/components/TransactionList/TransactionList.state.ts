import { useEffect, useMemo, useState } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionList } from '../../../../../api-contract/src';
import { Event, Listener, useEventEmitter } from '../../../base';
import { useRouter } from 'solito/router';

const LIMIT = 10;

export const useTransactionListState = () => {
  const router = useRouter();

  const [searchValue, setSearhValue] = useState('');

  const [query, setQuery] = useState('');

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    const timeout = setTimeout(() => setQuery(searchValue), 600);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const { data, status, error, refetch } = useTransactionList({
    sortBy: 'created_at',
    order: 'desc',
    query,
    limit: LIMIT,
    skip: (page - 1) * LIMIT,
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

  return {
    transactions: data?.data ?? [],
    status,
    error,
    refetch,
    searchValue,
    setSearhValue,
    emit,
    router,
    page,
    setPage,
    totalItem: data?.meta.total ?? 0,
    itemPerPage: LIMIT,
  };
};
