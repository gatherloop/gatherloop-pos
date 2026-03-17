import Router from 'next/router';
import { UrlProductListQueryRepository } from './productListQuery';

describe('UrlProductListQueryRepository', () => {
  let repo: UrlProductListQueryRepository;

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    (Router.replace as jest.Mock).mockClear();
    repo = new UrlProductListQueryRepository();
  });

  describe('getPage', () => {
    it('returns 1 as default when param is absent', () => {
      expect(repo.getPage()).toBe(1);
    });

    it('returns parsed page number when param is present', () => {
      window.history.pushState({}, '', '/?page=5');
      expect(repo.getPage()).toBe(5);
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
      window.history.pushState({}, '', '/?itemPerPage=25');
      expect(repo.getItemPerPage()).toBe(25);
    });
  });

  describe('setItemPerPage', () => {
    it('sets the itemPerPage param in the URL', () => {
      repo.setItemPerPage(20);
      expect(
        new URL(window.location.href).searchParams.get('itemPerPage')
      ).toBe('20');
    });
  });

  describe('getSearchQuery', () => {
    it('returns empty string as default when param is absent', () => {
      expect(repo.getSearchQuery()).toBe('');
    });

    it('returns the search query when param is present', () => {
      window.history.pushState({}, '', '/?query=shoes');
      expect(repo.getSearchQuery()).toBe('shoes');
    });
  });

  describe('setSearchQuery', () => {
    it('sets the query param in the URL', () => {
      repo.setSearchQuery('boots');
      expect(new URL(window.location.href).searchParams.get('query')).toBe(
        'boots'
      );
    });
  });

  describe('getSortBy', () => {
    it('returns "created_at" as default when param is absent', () => {
      expect(repo.getSortBy()).toBe('created_at');
    });

    it('returns "created_at" when param is valid', () => {
      window.history.pushState({}, '', '/?sortBy=created_at');
      expect(repo.getSortBy()).toBe('created_at');
    });

    it('returns "created_at" as fallback when param value is invalid', () => {
      window.history.pushState({}, '', '/?sortBy=unknown_field');
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

    it('returns "desc" when param is "desc"', () => {
      window.history.pushState({}, '', '/?orderBy=desc');
      expect(repo.getOrderBy()).toBe('desc');
    });

    it('returns "desc" as fallback when param value is invalid', () => {
      window.history.pushState({}, '', '/?orderBy=random');
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

  describe('getSaleType', () => {
    it('returns "all" as default when param is absent', () => {
      expect(repo.getSaleType()).toBe('all');
    });

    it('returns "purchase" when param is "purchase"', () => {
      window.history.pushState({}, '', '/?saleType=purchase');
      expect(repo.getSaleType()).toBe('purchase');
    });

    it('returns "rental" when param is "rental"', () => {
      window.history.pushState({}, '', '/?saleType=rental');
      expect(repo.getSaleType()).toBe('rental');
    });

    it('returns "all" as fallback when param value is invalid', () => {
      window.history.pushState({}, '', '/?saleType=unknown');
      expect(repo.getSaleType()).toBe('all');
    });
  });

  describe('setSaleType', () => {
    it('sets the saleType param in the URL', () => {
      repo.setSaleType('purchase');
      expect(new URL(window.location.href).searchParams.get('saleType')).toBe(
        'purchase'
      );
    });
  });
});
