import {
  TransactionVerificationUsecase,
  TransactionVerificationState,
  TransactionVerificationAction,
} from './transactionVerification';
import { MockTransactionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const createTester = (repository: MockTransactionRepository) =>
  new UsecaseTester<
    TransactionVerificationUsecase,
    TransactionVerificationState,
    TransactionVerificationAction,
    undefined
  >(new TransactionVerificationUsecase(repository));

describe('TransactionVerificationUsecase', () => {
  it('starts hidden', () => {
    const repository = new MockTransactionRepository();
    const tester = createTester(repository);

    expect(tester.state).toEqual({
      type: 'hidden',
      transactionId: null,
      verification: null,
      errorMessage: null,
    });
  });

  it('should transition hidden → loading → shown with the fetched photo on open', async () => {
    const repository = new MockTransactionRepository();
    const tester = createTester(repository);

    tester.dispatch({ type: 'SHOW', transactionId: 3 });
    expect(tester.state.type).toBe('loading');

    await flushPromises();

    expect(tester.state).toEqual({
      type: 'shown',
      transactionId: 3,
      verification: repository.verificationPhotos[3],
      errorMessage: null,
    });
  });

  it('should transition shown → approving → success on approve, marking the payment approved', async () => {
    const repository = new MockTransactionRepository();
    const approveSpy = jest.spyOn(repository, 'approveTransactionVerification');
    const tester = createTester(repository);

    tester.dispatch({ type: 'SHOW', transactionId: 3 });
    await flushPromises();

    tester.dispatch({ type: 'APPROVE' });
    expect(tester.state.type).toBe('approving');

    await flushPromises();

    expect(approveSpy).toHaveBeenCalledWith(3);
    expect(tester.state.type).toBe('hidden');
    const transaction = repository.transactions.find((t) => t.id === 3);
    expect(transaction?.paymentVerificationStatus).toBe('approved');
    expect(repository.verificationPhotos[3]).toBeUndefined();
  });

  it('should ignore REJECT from shown, requiring CONFIRM_REJECT first', async () => {
    const repository = new MockTransactionRepository();
    const rejectSpy = jest.spyOn(repository, 'rejectTransactionVerification');
    const tester = createTester(repository);

    tester.dispatch({ type: 'SHOW', transactionId: 3 });
    await flushPromises();

    tester.dispatch({ type: 'REJECT' });
    expect(tester.state.type).toBe('shown');
    expect(rejectSpy).not.toHaveBeenCalled();

    tester.dispatch({ type: 'CONFIRM_REJECT' });
    expect(tester.state.type).toBe('confirmingReject');

    tester.dispatch({ type: 'REJECT' });
    expect(tester.state.type).toBe('rejecting');

    await flushPromises();

    expect(rejectSpy).toHaveBeenCalledWith(3);
    expect(tester.state.type).toBe('hidden');
    expect(repository.transactions.find((t) => t.id === 3)).toBeUndefined();
  });

  it('should return to shown when the reject confirmation is cancelled', async () => {
    const repository = new MockTransactionRepository();
    const rejectSpy = jest.spyOn(repository, 'rejectTransactionVerification');
    const tester = createTester(repository);

    tester.dispatch({ type: 'SHOW', transactionId: 3 });
    await flushPromises();

    tester.dispatch({ type: 'CONFIRM_REJECT' });
    tester.dispatch({ type: 'CANCEL_REJECT' });

    expect(tester.state.type).toBe('shown');
    expect(rejectSpy).not.toHaveBeenCalled();
  });

  it('should land in gone when the photo is already decided (404)', async () => {
    const repository = new MockTransactionRepository();
    const tester = createTester(repository);

    tester.dispatch({ type: 'SHOW', transactionId: 1 });
    await flushPromises();

    expect(tester.state).toEqual({
      type: 'gone',
      transactionId: 1,
      verification: null,
      errorMessage: null,
    });
  });

  it('should transition to error on a failed fetch, and clear it on hide', async () => {
    const repository = new MockTransactionRepository();
    repository.setShouldFail(true);
    const tester = createTester(repository);

    tester.dispatch({ type: 'SHOW', transactionId: 3 });
    await flushPromises();

    expect(tester.state.type).toBe('error');
    expect(tester.state.errorMessage).toBe('Failed to load the verification photo');

    tester.dispatch({ type: 'HIDE' });
    expect(tester.state).toEqual({
      type: 'hidden',
      transactionId: null,
      verification: null,
      errorMessage: null,
    });
  });

  it('should transition to error on a failed approve', async () => {
    const repository = new MockTransactionRepository();
    const tester = createTester(repository);

    tester.dispatch({ type: 'SHOW', transactionId: 3 });
    await flushPromises();

    repository.setShouldFail(true);
    tester.dispatch({ type: 'APPROVE' });
    await flushPromises();

    expect(tester.state.type).toBe('error');
    expect(tester.state.errorMessage).toBe('Failed to approve the order');
  });

  it('should transition to error on a failed reject', async () => {
    const repository = new MockTransactionRepository();
    const tester = createTester(repository);

    tester.dispatch({ type: 'SHOW', transactionId: 3 });
    await flushPromises();

    repository.setShouldFail(true);
    tester.dispatch({ type: 'CONFIRM_REJECT' });
    tester.dispatch({ type: 'REJECT' });
    await flushPromises();

    expect(tester.state.type).toBe('error');
    expect(tester.state.errorMessage).toBe('Failed to reject the order');
  });
});
