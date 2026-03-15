import {
  CalculationListUsecase,
  CalculationListAction,
  CalculationListState,
  CalculationListParams,
} from './calculationList';
import { MockCalculationRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('CalculationListUsecase', () => {
  describe('success flow', () => {
    const repository = new MockCalculationRepository();
    const usecase = new CalculationListUsecase(repository, {
      calculations: [],
    });
    let calculationList: UsecaseTester<
      CalculationListUsecase,
      CalculationListState,
      CalculationListAction,
      CalculationListParams
    >;

    it('initialize with loading state', () => {
      calculationList = new UsecaseTester<
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
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(calculationList.state).toEqual({
        type: 'loaded',
        calculations: repository.calculations,
        errorMessage: null,
      });
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
      calculationList.dispatch({ type: 'FETCH' });
      expect(calculationList.state).toEqual({
        type: 'revalidating',
        calculations: repository.calculations,
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(calculationList.state).toEqual({
        type: 'loaded',
        calculations: repository.calculations,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    const repository = new MockCalculationRepository();
    repository.setShouldFail(true);
    const usecase = new CalculationListUsecase(repository, {
      calculations: [],
    });
    let calculationList: UsecaseTester<
      CalculationListUsecase,
      CalculationListState,
      CalculationListAction,
      CalculationListParams
    >;

    it('initialize with loading state', () => {
      calculationList = new UsecaseTester<
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
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(calculationList.state).toEqual({
        type: 'error',
        calculations: [],
        errorMessage: 'Failed to fetch calculations',
      });
    });

    it('transition to loading state after FETCH action is dispatched', () => {
      repository.setShouldFail(false);
      calculationList.dispatch({ type: 'FETCH' });
      expect(calculationList.state).toEqual({
        type: 'loading',
        calculations: [],
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
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
