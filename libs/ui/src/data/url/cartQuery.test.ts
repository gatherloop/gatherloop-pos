import Router from 'next/router';
import { UrlCartQueryRepository } from './cartQuery';

describe('UrlCartQueryRepository', () => {
  const repository = new UrlCartQueryRepository();

  afterEach(() => {
    window.history.pushState({}, '', 'http://localhost/');
    jest.clearAllMocks();
  });

  describe('getSelectedItemId', () => {
    it('is null with no ?item param', () => {
      expect(repository.getSelectedItemId()).toBeNull();
    });

    it('reads ?item as a number', () => {
      window.history.pushState({}, '', 'http://localhost/?item=42');
      expect(repository.getSelectedItemId()).toBe(42);
    });
  });

  describe('setSelectedItemId', () => {
    it('pushes ?item=<id>, not replaces, so Back dismisses it (D6)', () => {
      repository.setSelectedItemId(7);

      expect(Router.push).toHaveBeenCalledWith(
        expect.stringContaining('item=7'),
        undefined,
        { shallow: true }
      );
      expect(Router.replace).not.toHaveBeenCalled();
    });

    it('removes the param instead of writing an empty value when cleared', () => {
      repository.setSelectedItemId(null);

      const [url] = (Router.push as jest.Mock).mock.calls[0];
      expect(url).not.toContain('item');
    });
  });
});
