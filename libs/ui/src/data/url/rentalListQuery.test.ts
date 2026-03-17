import Router from 'next/router';
import { UrlRentalListQueryRepository } from './rentalListQuery';

describe('UrlRentalListQueryRepository', () => {
  let repo: UrlRentalListQueryRepository;

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    (Router.replace as jest.Mock).mockClear();
    repo = new UrlRentalListQueryRepository();
  });

  describe('getPage', () => {
    it('returns 1 as default when param is absent', () => {
      expect(repo.getPage()).toBe(1);
    });

    it('returns parsed page number when param is present', () => {
      window.history.pushState({}, '', '/?page=6');
      expect(repo.getPage()).toBe(6);
    });
  });

  describe('setPage', () => {
    it('sets the page param in the URL', () => {
      repo.setPage(3);
      expect(new URL(window.location.href).searchParams.get('page')).toBe('3');
    });
  });

  describe('getItemPerPage', () => {
    it('returns 10 as default when param is absent', () => {
      expect(repo.getItemPerPage()).toBe(10);
    });

    it('returns parsed itemPerPage when param is present', () => {
      window.history.pushState({}, '', '/?itemPerPage=15');
      expect(repo.getItemPerPage()).toBe(15);
    });
  });

  describe('setItemPerPage', () => {
    it('sets the itemPerPage param in the URL', () => {
      repo.setItemPerPage(10);
      expect(
        new URL(window.location.href).searchParams.get('itemPerPage')
      ).toBe('10');
    });
  });

  describe('getSearchQuery', () => {
    it('returns empty string as default when param is absent', () => {
      expect(repo.getSearchQuery()).toBe('');
    });

    it('returns the search query when param is present', () => {
      window.history.pushState({}, '', '/?query=bike');
      expect(repo.getSearchQuery()).toBe('bike');
    });
  });

  describe('setSearchQuery', () => {
    it('sets the query param in the URL', () => {
      repo.setSearchQuery('scooter');
      expect(new URL(window.location.href).searchParams.get('query')).toBe(
        'scooter'
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

  describe('getCheckoutStatus', () => {
    it('returns "all" as default when param is absent', () => {
      expect(repo.getCheckoutStatus()).toBe('all');
    });

    it('returns "completed" when param is "completed"', () => {
      window.history.pushState({}, '', '/?checkoutStatus=completed');
      expect(repo.getCheckoutStatus()).toBe('completed');
    });

    it('returns "ongoing" when param is "ongoing"', () => {
      window.history.pushState({}, '', '/?checkoutStatus=ongoing');
      expect(repo.getCheckoutStatus()).toBe('ongoing');
    });

    it('returns "all" as fallback when param value is invalid', () => {
      window.history.pushState({}, '', '/?checkoutStatus=unknown');
      expect(repo.getCheckoutStatus()).toBe('all');
    });
  });

  describe('setCheckoutStatus', () => {
    it('sets the paymentStatus param in the URL', () => {
      repo.setCheckoutStatus('completed');
      expect(
        new URL(window.location.href).searchParams.get('paymentStatus')
      ).toBe('completed');
    });
  });
});
