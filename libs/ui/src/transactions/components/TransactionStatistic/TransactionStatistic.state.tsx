// eslint-disable-next-line @nx/enforce-module-boundaries
import { useTransactionStatistics } from '../../../../../api-contract/src';
import { useState } from 'react';

export const useTransactionStatisticState = () => {
  const [groupBy, setGroupBy] = useState<'month' | 'date'>('date');
  const { data, status, refetch } = useTransactionStatistics({ groupBy });
  return {
    statistics: data?.data ?? [],
    status,
    refetch,
    setGroupBy,
    groupBy,
  };
};
