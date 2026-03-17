import Router from 'next/router';
import { UrlTransactionStatisticListQueryRepository } from './transactionStatisticListQuery';

describe('UrlTransactionStatisticListQueryRepository', () => {
  let repo: UrlTransactionStatisticListQueryRepository;

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    (Router.replace as jest.Mock).mockClear();
    repo = new UrlTransactionStatisticListQueryRepository();
  });

  describe('getGroupBy', () => {
    it('returns "date" as default when param is absent', () => {
      expect(repo.getGroupBy()).toBe('date');
    });

    it('returns "date" when param is "date"', () => {
      window.history.pushState({}, '', '/?groupBy=date');
      expect(repo.getGroupBy()).toBe('date');
    });

    it('returns "month" when param is "month"', () => {
      window.history.pushState({}, '', '/?groupBy=month');
      expect(repo.getGroupBy()).toBe('month');
    });

    it('returns "date" as fallback when param value is invalid', () => {
      window.history.pushState({}, '', '/?groupBy=year');
      expect(repo.getGroupBy()).toBe('date');
    });
  });

  describe('setGroupBy', () => {
    it('sets the groupBy param in the URL', () => {
      repo.setGroupBy('month');
      expect(new URL(window.location.href).searchParams.get('groupBy')).toBe(
        'month'
      );
    });
  });
});
