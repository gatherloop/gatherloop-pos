import dayjs from 'dayjs';

export type TransactionStatisticDateRange = {
  startDate: string | null;
  endDate: string | null;
};

export type TransactionStatisticPreset =
  | 'last7Days'
  | 'last30Days'
  | 'last3Months'
  | 'last12Months'
  | 'thisMonth'
  | 'thisYear'
  | 'custom';

const DATE_FORMAT = 'YYYY-MM-DD';

export function getDateRangeForPreset(
  preset: TransactionStatisticPreset,
  today: Date = new Date()
): TransactionStatisticDateRange & { groupBy: 'date' | 'month' } {
  const endDate = dayjs(today).format(DATE_FORMAT);

  switch (preset) {
    case 'last7Days':
      return {
        startDate: dayjs(today).subtract(6, 'day').format(DATE_FORMAT),
        endDate,
        groupBy: 'date',
      };
    case 'last30Days':
      return {
        startDate: dayjs(today).subtract(29, 'day').format(DATE_FORMAT),
        endDate,
        groupBy: 'date',
      };
    case 'last3Months':
      return {
        startDate: dayjs(today).subtract(3, 'month').format(DATE_FORMAT),
        endDate,
        groupBy: 'date',
      };
    case 'last12Months':
      return {
        startDate: dayjs(today).subtract(12, 'month').format(DATE_FORMAT),
        endDate,
        groupBy: 'month',
      };
    case 'thisMonth':
      return {
        startDate: dayjs(today).startOf('month').format(DATE_FORMAT),
        endDate,
        groupBy: 'date',
      };
    case 'thisYear':
      return {
        startDate: dayjs(today).startOf('year').format(DATE_FORMAT),
        endDate,
        groupBy: 'month',
      };
    case 'custom':
      return { startDate: null, endDate: null, groupBy: 'date' };
  }
}

export const DEFAULT_TRANSACTION_STATISTIC_PRESET: TransactionStatisticPreset =
  'last30Days';
