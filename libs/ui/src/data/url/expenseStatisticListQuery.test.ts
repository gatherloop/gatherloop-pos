import { UrlExpenseStatisticListQueryRepository } from './expenseStatisticListQuery';

describe('UrlExpenseStatisticListQueryRepository', () => {
  const repository = new UrlExpenseStatisticListQueryRepository();

  afterEach(() => {
    window.history.pushState({}, '', 'http://localhost/');
  });

  describe('defaults (D5)', () => {
    it('defaults view to budget', () => {
      expect(repository.getView()).toEqual('budget');
    });

    it('defaults groupBy to month', () => {
      expect(repository.getGroupBy()).toEqual('month');
    });

    it('defaults preset to last12Months', () => {
      expect(repository.getPreset()).toEqual('last12Months');
    });

    it('derives startDate/endDate from the default preset', () => {
      expect(repository.getStartDate()).not.toBeNull();
      expect(repository.getEndDate()).not.toBeNull();
    });
  });

  describe('reading prefixed query params (D8)', () => {
    it('reads expenseView', () => {
      window.history.pushState({}, '', 'http://localhost/?expenseView=combined');
      expect(repository.getView()).toEqual('combined');
    });

    it('falls back to the default for an invalid expenseView', () => {
      window.history.pushState({}, '', 'http://localhost/?expenseView=bogus');
      expect(repository.getView()).toEqual('budget');
    });

    it('reads expenseGroupBy', () => {
      window.history.pushState({}, '', 'http://localhost/?expenseGroupBy=date');
      expect(repository.getGroupBy()).toEqual('date');
    });

    it('reads expensePreset', () => {
      window.history.pushState({}, '', 'http://localhost/?expensePreset=thisMonth');
      expect(repository.getPreset()).toEqual('thisMonth');
    });

    it('reads expenseStartDate/expenseEndDate directly when present', () => {
      window.history.pushState(
        {},
        '',
        'http://localhost/?expenseStartDate=2025-01-01&expenseEndDate=2025-01-31'
      );
      expect(repository.getStartDate()).toEqual('2025-01-01');
      expect(repository.getEndDate()).toEqual('2025-01-31');
    });

    it('does not collide with the unprefixed transaction params', () => {
      window.history.pushState(
        {},
        '',
        'http://localhost/?groupBy=date&preset=last7Days'
      );
      expect(repository.getGroupBy()).toEqual('month');
      expect(repository.getPreset()).toEqual('last12Months');
    });
  });
});
