import { getDateRangeForPreset } from './TransactionStatisticDateRange';

describe('getDateRangeForPreset', () => {
  const today = new Date('2025-03-15T12:00:00Z');

  it('computes last7Days', () => {
    expect(getDateRangeForPreset('last7Days', today)).toEqual({
      startDate: '2025-03-09',
      endDate: '2025-03-15',
      groupBy: 'date',
    });
  });

  it('computes last30Days', () => {
    expect(getDateRangeForPreset('last30Days', today)).toEqual({
      startDate: '2025-02-14',
      endDate: '2025-03-15',
      groupBy: 'date',
    });
  });

  it('computes last3Months', () => {
    expect(getDateRangeForPreset('last3Months', today)).toEqual({
      startDate: '2024-12-15',
      endDate: '2025-03-15',
      groupBy: 'date',
    });
  });

  it('computes last12Months with month granularity', () => {
    expect(getDateRangeForPreset('last12Months', today)).toEqual({
      startDate: '2024-03-15',
      endDate: '2025-03-15',
      groupBy: 'month',
    });
  });

  it('computes thisMonth starting on the 1st', () => {
    expect(getDateRangeForPreset('thisMonth', today)).toEqual({
      startDate: '2025-03-01',
      endDate: '2025-03-15',
      groupBy: 'date',
    });
  });

  it('computes thisYear starting on Jan 1 with month granularity', () => {
    expect(getDateRangeForPreset('thisYear', today)).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-03-15',
      groupBy: 'month',
    });
  });

  it('computes thisMonth correctly across a year boundary', () => {
    const newYearToday = new Date('2025-01-05T12:00:00Z');
    expect(getDateRangeForPreset('thisMonth', newYearToday)).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-01-05',
      groupBy: 'date',
    });
  });

  it('returns null bounds for custom', () => {
    expect(getDateRangeForPreset('custom', today)).toEqual({
      startDate: null,
      endDate: null,
      groupBy: 'date',
    });
  });
});
