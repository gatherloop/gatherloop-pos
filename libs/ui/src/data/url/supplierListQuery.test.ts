import Router from 'next/router';
import { UrlSupplierListQueryRepository } from './supplierListQuery';

describe('UrlSupplierListQueryRepository', () => {
  let repo: UrlSupplierListQueryRepository;

  beforeEach(() => {
    window.history.pushState({}, '', '/');
    (Router.replace as jest.Mock).mockClear();
    repo = new UrlSupplierListQueryRepository();
  });

  describe('getPage', () => {
    it('returns 1 as default when param is absent', () => {
      expect(repo.getPage()).toBe(1);
    });

    it('returns parsed page number when param is present', () => {
      window.history.pushState({}, '', '/?page=10');
      expect(repo.getPage()).toBe(10);
    });
  });

  describe('setPage', () => {
    it('sets the page param in the URL', () => {
      repo.setPage(8);
      expect(new URL(window.location.href).searchParams.get('page')).toBe('8');
    });
  });

  describe('getItemPerPage', () => {
    it('returns 10 as default when param is absent', () => {
      expect(repo.getItemPerPage()).toBe(10);
    });

    it('returns parsed itemPerPage when param is present', () => {
      window.history.pushState({}, '', '/?itemPerPage=100');
      expect(repo.getItemPerPage()).toBe(100);
    });
  });

  describe('setItemPerPage', () => {
    it('sets the itemPerPage param in the URL', () => {
      repo.setItemPerPage(30);
      expect(
        new URL(window.location.href).searchParams.get('itemPerPage')
      ).toBe('30');
    });
  });

  describe('getSearchQuery', () => {
    it('returns empty string as default when param is absent', () => {
      expect(repo.getSearchQuery()).toBe('');
    });

    it('returns the search query when param is present', () => {
      window.history.pushState({}, '', '/?query=acme');
      expect(repo.getSearchQuery()).toBe('acme');
    });
  });

  describe('setSearchQuery', () => {
    it('sets the query param in the URL', () => {
      repo.setSearchQuery('supplier-corp');
      expect(new URL(window.location.href).searchParams.get('query')).toBe(
        'supplier-corp'
      );
    });
  });

  describe('getSortBy', () => {
    it('returns "created_at" as default when param is absent', () => {
      expect(repo.getSortBy()).toBe('created_at');
    });

    it('returns "created_at" as fallback when param value is invalid', () => {
      window.history.pushState({}, '', '/?sortBy=name');
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
});
