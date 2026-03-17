import {
  CalculationListUsecase,
  CalculationListAction,
  CalculationListState,
  CalculationListParams,
} from './calculationList';
import { MockCalculationRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('CalculationListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded', async () => {
      const repository = new MockCalculationRepository();
      const usecase = new CalculationListUsecase(repository, {
        calculations: [],
      });
      const calculationList = new UsecaseTester<
        CalculationListUsecase,
        CalculationListState,
        CalculationListAction,
        CalculationListParams
      >(usecase);

      expect(calculationList.state).toEqual({
        type: 'loading',
        calculations: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(calculationList.state).toEqual({
        type: 'loaded',
        calculations: repository.calculations,
        errorMessage: null,
      });

      calculationList.dispatch({ type: 'FETCH' });
      expect(calculationList.state).toEqual({
        type: 'revalidating',
        calculations: repository.calculations,
        errorMessage: null,
      });

      await flushPromises();
      expect(calculationList.state).toEqual({
        type: 'loaded',
        calculations: repository.calculations,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockCalculationRepository();
      repository.setShouldFail(true);
      const usecase = new CalculationListUsecase(repository, {
        calculations: [],
      });
      const calculationList = new UsecaseTester<
        CalculationListUsecase,
        CalculationListState,
        CalculationListAction,
        CalculationListParams
      >(usecase);

      expect(calculationList.state).toEqual({
        type: 'loading',
        calculations: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(calculationList.state).toEqual({
        type: 'error',
        calculations: [],
        errorMessage: 'Failed to fetch calculations',
      });

      repository.setShouldFail(false);
      calculationList.dispatch({ type: 'FETCH' });
      expect(calculationList.state).toEqual({
        type: 'loading',
        calculations: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(calculationList.state).toEqual({
        type: 'loaded',
        calculations: repository.calculations,
        errorMessage: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockCalculationRepository();

    const calculations = [repository.calculations[0]];

    const usecase = new CalculationListUsecase(repository, { calculations });

    const calculationList = new UsecaseTester<
      CalculationListUsecase,
      CalculationListState,
      CalculationListAction,
      CalculationListParams
    >(usecase);

    expect(calculationList.state).toEqual({
      type: 'loaded',
      calculations,
      errorMessage: null,
    });
  });
});
