import Router from 'next/router';
import { UrlTransactionListQueryRepository } from './transactionListQuery';

describe('UrlTransactionListQueryRepository', () => {
  let repo: UrlTransactionListQueryRepository;

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    (Router.replace as jest.Mock).mockClear();
    repo = new UrlTransactionListQueryRepository();
  });

  describe('getPage', () => {
    it('returns 1 as default when param is absent', () => {
      expect(repo.getPage()).toBe(1);
    });

    it('returns parsed page number when param is present', () => {
      window.history.pushState({}, '', '/?page=4');
      expect(repo.getPage()).toBe(4);
    });
  });

  describe('setPage', () => {
    it('sets the page param in the URL', () => {
      repo.setPage(2);
      expect(new URL(window.location.href).searchParams.get('page')).toBe('2');
    });
  });

  describe('getItemPerPage', () => {
    it('returns 10 as default when param is absent', () => {
      expect(repo.getItemPerPage()).toBe(10);
    });

    it('returns parsed itemPerPage when param is present', () => {
      window.history.pushState({}, '', '/?itemPerPage=50');
      expect(repo.getItemPerPage()).toBe(50);
    });
  });

  describe('setItemPerPage', () => {
    it('sets the itemPerPage param in the URL', () => {
      repo.setItemPerPage(15);
      expect(
        new URL(window.location.href).searchParams.get('itemPerPage')
      ).toBe('15');
    });
  });

  describe('getSearchQuery', () => {
    it('returns empty string as default when param is absent', () => {
      expect(repo.getSearchQuery()).toBe('');
    });

    it('returns the search query when param is present', () => {
      window.history.pushState({}, '', '/?query=coffee');
      expect(repo.getSearchQuery()).toBe('coffee');
    });
  });

  describe('setSearchQuery', () => {
    it('sets the query param in the URL', () => {
      repo.setSearchQuery('latte');
      expect(new URL(window.location.href).searchParams.get('query')).toBe(
        'latte'
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
      repo.setOrderBy('desc');
      expect(new URL(window.location.href).searchParams.get('orderBy')).toBe(
        'desc'
      );
    });
  });

  describe('getPaymentStatus', () => {
    it('returns "all" as default when param is absent', () => {
      expect(repo.getPaymentStatus()).toBe('all');
    });

    it('returns "paid" when param is "paid"', () => {
      window.history.pushState({}, '', '/?paymentStatus=paid');
      expect(repo.getPaymentStatus()).toBe('paid');
    });

    it('returns "unpaid" when param is "unpaid"', () => {
      window.history.pushState({}, '', '/?paymentStatus=unpaid');
      expect(repo.getPaymentStatus()).toBe('unpaid');
    });

    it('returns "all" as fallback when param value is invalid', () => {
      window.history.pushState({}, '', '/?paymentStatus=invalid');
      expect(repo.getPaymentStatus()).toBe('all');
    });
  });

  describe('setPaymentStatus', () => {
    it('sets the paymentStatus param in the URL', () => {
      repo.setPaymentStatus('paid');
      expect(
        new URL(window.location.href).searchParams.get('paymentStatus')
      ).toBe('paid');
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
      window.history.pushState({}, '', '/?walletId=7');
      expect(repo.getWalletId()).toBe(7);
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
      repo.setWalletId(42);
      expect(new URL(window.location.href).searchParams.get('walletId')).toBe(
        '42'
      );
    });
  });
});
