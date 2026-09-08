import Router from 'next/router';
import { UrlMenuListQueryRepository } from './menuListQuery';

describe('UrlMenuListQueryRepository', () => {
  const repository = new UrlMenuListQueryRepository();

  afterEach(() => {
    window.history.pushState({}, '', 'http://localhost/');
    jest.clearAllMocks();
  });

  describe('getSelectedProductId', () => {
    it('is null with no ?product param', () => {
      expect(repository.getSelectedProductId()).toBeNull();
    });

    it('reads ?product as a number', () => {
      window.history.pushState({}, '', 'http://localhost/?product=42');
      expect(repository.getSelectedProductId()).toBe(42);
    });
  });

  describe('setSelectedProductId', () => {
    it('pushes ?product=<id>, not replaces, so Back dismisses it (D6)', () => {
      repository.setSelectedProductId(7);

      expect(Router.push).toHaveBeenCalledWith(
        expect.stringContaining('product=7'),
        undefined,
        { shallow: true }
      );
      expect(Router.replace).not.toHaveBeenCalled();
    });

    it('removes the param instead of writing an empty value when cleared', () => {
      repository.setSelectedProductId(null);

      const [url] = (Router.push as jest.Mock).mock.calls[0];
      expect(url).not.toContain('product');
    });
  });
});
