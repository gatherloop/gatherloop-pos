import Router from 'next/router';
import { UrlExpenseListQueryRepository } from './expenseListQuery';

describe('UrlExpenseListQueryRepository', () => {
  let repo: UrlExpenseListQueryRepository;

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    (Router.replace as jest.Mock).mockClear();
    repo = new UrlExpenseListQueryRepository();
  });

  describe('getPage', () => {
    it('returns 1 as default when param is absent', () => {
      expect(repo.getPage()).toBe(1);
    });

    it('returns parsed page number when param is present', () => {
      window.history.pushState({}, '', '/?page=2');
      expect(repo.getPage()).toBe(2);
    });
  });

  describe('setPage', () => {
    it('sets the page param in the URL', () => {
      repo.setPage(6);
      expect(new URL(window.location.href).searchParams.get('page')).toBe('6');
    });
  });

  describe('getItemPerPage', () => {
    it('returns 10 as default when param is absent', () => {
      expect(repo.getItemPerPage()).toBe(10);
    });

    it('returns parsed itemPerPage when param is present', () => {
      window.history.pushState({}, '', '/?itemPerPage=30');
      expect(repo.getItemPerPage()).toBe(30);
    });
  });

  describe('setItemPerPage', () => {
    it('sets the itemPerPage param in the URL', () => {
      repo.setItemPerPage(25);
      expect(
        new URL(window.location.href).searchParams.get('itemPerPage')
      ).toBe('25');
    });
  });

  describe('getSearchQuery', () => {
    it('returns empty string as default when param is absent', () => {
      expect(repo.getSearchQuery()).toBe('');
    });

    it('returns the search query when param is present', () => {
      window.history.pushState({}, '', '/?query=food');
      expect(repo.getSearchQuery()).toBe('food');
    });
  });

  describe('setSearchQuery', () => {
    it('sets the query param in the URL', () => {
      repo.setSearchQuery('transport');
      expect(new URL(window.location.href).searchParams.get('query')).toBe(
        'transport'
      );
    });
  });

  describe('getSortBy', () => {
    it('returns "created_at" as default when param is absent', () => {
      expect(repo.getSortBy()).toBe('created_at');
    });

    it('returns "created_at" as fallback when param value is invalid', () => {
      window.history.pushState({}, '', '/?sortBy=invalid');
      expect(repo.getSortBy()).toBe('created_at');
    });
  });

  describe('setSortBy', () => {
    it('sets the sortBy param in the URL', () => {
      repo.setSortBy('created_at');
      expect(new URL(window.location.href).searchParams.get('sortBy')).toBe(
        'created_at'
      );
    });
  });

  describe('getOrderBy', () => {
    it('returns "desc" as default when param is absent', () => {
      expect(repo.getOrderBy()).toBe('desc');
    });

    it('returns "asc" when param is "asc"', () => {
      window.history.pushState({}, '', '/?orderBy=asc');
      expect(repo.getOrderBy()).toBe('asc');
    });

    it('returns "desc" as fallback when param value is invalid', () => {
      window.history.pushState({}, '', '/?orderBy=invalid');
      expect(repo.getOrderBy()).toBe('desc');
    });
  });

  describe('setOrderBy', () => {
    it('sets the orderBy param in the URL', () => {
      repo.setOrderBy('asc');
      expect(new URL(window.location.href).searchParams.get('orderBy')).toBe(
        'asc'
      );
    });
  });

  describe('getWalletId', () => {
    it('returns null as default when param is absent', () => {
      expect(repo.getWalletId()).toBeNull();
    });

    it('returns null when param is "all"', () => {
      window.history.pushState({}, '', '/?walletId=all');
      expect(repo.getWalletId()).toBeNull();
    });

    it('returns parsed number when param is a numeric string', () => {
      window.history.pushState({}, '', '/?walletId=3');
      expect(repo.getWalletId()).toBe(3);
    });
  });

  describe('setWalletId', () => {
    it('sets walletId param to "all" when value is null', () => {
      repo.setWalletId(null);
      expect(new URL(window.location.href).searchParams.get('walletId')).toBe(
        'all'
      );
    });

    it('sets walletId param to the numeric string when value is a number', () => {
      repo.setWalletId(9);
      expect(new URL(window.location.href).searchParams.get('walletId')).toBe(
        '9'
      );
    });
  });

  describe('getBudgetId', () => {
    it('returns null as default when param is absent', () => {
      expect(repo.getBudgetId()).toBeNull();
    });

    it('returns null when param is "all"', () => {
      window.history.pushState({}, '', '/?budgetId=all');
      expect(repo.getBudgetId()).toBeNull();
    });

    it('returns parsed number when param is a numeric string', () => {
      window.history.pushState({}, '', '/?budgetId=5');
      expect(repo.getBudgetId()).toBe(5);
    });
  });
});
