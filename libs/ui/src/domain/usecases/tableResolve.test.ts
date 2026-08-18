import {
  TableResolveUsecase,
  TableResolveState,
  TableResolveAction,
  TableResolveParams,
} from './tableResolve';
import { MockPublicTableRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const createTester = (
  repository: MockPublicTableRepository,
  code: string | null
) =>
  new UsecaseTester<
    TableResolveUsecase,
    TableResolveState,
    TableResolveAction,
    TableResolveParams
  >(new TableResolveUsecase(repository, { code }));

describe('TableResolveUsecase', () => {
  it('starts in noCode and never fetches when there is no code', async () => {
    const repository = new MockPublicTableRepository();
    const resolveSpy = jest.spyOn(repository, 'resolveTableByCode');

    const tableResolve = createTester(repository, null);

    expect(tableResolve.state).toEqual({
      type: 'noCode',
      code: null,
      table: null,
      errorMessage: null,
    });

    await flushPromises();
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  it('should transition idle → resolving → resolved on a known code', async () => {
    const repository = new MockPublicTableRepository();
    const tableResolve = createTester(repository, repository.codes[0]);

    expect(tableResolve.state).toEqual({
      type: 'resolving',
      code: repository.codes[0],
      table: null,
      errorMessage: null,
    });

    await flushPromises();
    expect(tableResolve.state).toEqual({
      type: 'resolved',
      code: repository.codes[0],
      table: repository.tables[repository.codes[0]],
      errorMessage: null,
    });
  });

  it('should transition idle → resolving → notFound on an unknown code', async () => {
    const repository = new MockPublicTableRepository();
    const tableResolve = createTester(repository, 'UNKNOWNCODE');

    await flushPromises();
    expect(tableResolve.state).toEqual({
      type: 'notFound',
      code: 'UNKNOWNCODE',
      table: null,
      errorMessage: null,
    });
  });

  it('should transition idle → resolving → error → resolving → resolved on retry', async () => {
    const repository = new MockPublicTableRepository();
    repository.setShouldFail(true);
    const tableResolve = createTester(repository, repository.codes[0]);

    await flushPromises();
    expect(tableResolve.state).toEqual({
      type: 'error',
      code: repository.codes[0],
      table: null,
      errorMessage: 'Failed to resolve table',
    });

    repository.setShouldFail(false);
    tableResolve.dispatch({ type: 'FETCH' });
    expect(tableResolve.state).toEqual({
      type: 'resolving',
      code: repository.codes[0],
      table: null,
      errorMessage: null,
    });

    await flushPromises();
    expect(tableResolve.state).toEqual({
      type: 'resolved',
      code: repository.codes[0],
      table: repository.tables[repository.codes[0]],
      errorMessage: null,
    });
  });
});
