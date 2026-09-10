import {
  CheckoutUsecase,
  CheckoutAction,
  CheckoutState,
  CheckoutParams,
} from './checkout';
import { MockPaymentRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

const flushMicrotasks = () => jest.advanceTimersByTimeAsync(0);

const createTester = (repository: MockPaymentRepository, customerName = '') =>
  new UsecaseTester<CheckoutUsecase, CheckoutState, CheckoutAction, CheckoutParams>(
    new CheckoutUsecase(repository, { customerName })
  );

describe('CheckoutUsecase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should transition idle → askingName → creatingPayment → awaitingPayment', async () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_NAME' });
    expect(checkout.state.type).toBe('askingName');

    checkout.dispatch({ type: 'CHANGE_NAME', name: 'Budi' });
    checkout.dispatch({ type: 'SUBMIT_NAME' });
    expect(checkout.state.type).toBe('creatingPayment');
    expect(checkout.state.customerName).toBe('Budi');

    await flushMicrotasks();
    expect(checkout.state.type).toBe('awaitingPayment');
    expect(checkout.state.payment).toEqual(repository.payment);
  });

  it('should hold an empty name at askingName with an error', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_NAME' });
    checkout.dispatch({ type: 'CHANGE_NAME', name: '   ' });
    checkout.dispatch({ type: 'SUBMIT_NAME' });

    expect(checkout.state.type).toBe('askingName');
    expect(checkout.state.nameErrorMessage).toBe('Nama tidak boleh kosong');
  });

  it('should hold an over-long name at askingName with an error', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_NAME' });
    checkout.dispatch({ type: 'CHANGE_NAME', name: 'a'.repeat(61) });
    checkout.dispatch({ type: 'SUBMIT_NAME' });

    expect(checkout.state.type).toBe('askingName');
    expect(checkout.state.nameErrorMessage).toBe('Nama maksimal 60 karakter');
  });

  it('should return to idle having created nothing on CANCEL_NAME', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_NAME' });
    checkout.dispatch({ type: 'CHANGE_NAME', name: 'Budi' });
    checkout.dispatch({ type: 'CANCEL_NAME' });

    expect(checkout.state.type).toBe('idle');
    expect(checkout.state.payment).toBeNull();
  });

  it('should still require an explicit submit when the name is seeded', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository, 'Budi');

    expect(checkout.state.type).toBe('idle');
    expect(checkout.state.customerName).toBe('Budi');
  });

  it('should transition creatingPayment → error and retry', async () => {
    const repository = new MockPaymentRepository();
    repository.setShouldFailCheckout(true);
    const checkout = createTester(repository, 'Budi');

    checkout.dispatch({ type: 'ASK_NAME' });
    checkout.dispatch({ type: 'SUBMIT_NAME' });
    await flushMicrotasks();

    expect(checkout.state.type).toBe('error');
    expect(checkout.state.errorMessage).toBe('Failed to create payment');

    repository.setShouldFailCheckout(false);
    checkout.dispatch({ type: 'SUBMIT_NAME' });
    expect(checkout.state.type).toBe('creatingPayment');

    await flushMicrotasks();
    expect(checkout.state.type).toBe('awaitingPayment');
  });

  describe('awaitingPayment', () => {
    const enterAwaitingPayment = async (repository: MockPaymentRepository) => {
      const checkout = createTester(repository, 'Budi');
      checkout.dispatch({ type: 'ASK_NAME' });
      checkout.dispatch({ type: 'SUBMIT_NAME' });
      await flushMicrotasks();
      return checkout;
    };

    it('should transition to paid on a POLL that reports paid', async () => {
      const repository = new MockPaymentRepository();
      const checkout = await enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'paid' };
      checkout.dispatch({ type: 'POLL' });
      await flushMicrotasks();

      expect(checkout.state.type).toBe('paid');
      expect(checkout.state.payment?.status).toBe('paid');
    });

    it('should keep awaitingPayment on a poll error', async () => {
      const repository = new MockPaymentRepository();
      const checkout = await enterAwaitingPayment(repository);

      repository.setShouldFailFetch(true);
      checkout.dispatch({ type: 'POLL' });
      expect(checkout.state.isPolling).toBe(true);

      await flushMicrotasks();
      expect(checkout.state.type).toBe('awaitingPayment');
      expect(checkout.state.isPolling).toBe(false);
    });

    it('should transition to expired on a server status', async () => {
      const repository = new MockPaymentRepository();
      const checkout = await enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'expired' };
      checkout.dispatch({ type: 'POLL' });
      await flushMicrotasks();

      expect(checkout.state.type).toBe('expired');
    });

    it('should issue one final poll on COUNTDOWN_ELAPSED without expiring on its own', async () => {
      const repository = new MockPaymentRepository();
      const checkout = await enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'expired' };
      checkout.dispatch({ type: 'COUNTDOWN_ELAPSED' });

      expect(checkout.state.type).toBe('awaitingPayment');
      expect(checkout.state.isPolling).toBe(true);

      await flushMicrotasks();
      expect(checkout.state.type).toBe('expired');
    });

    it('should let a paid result from the final poll win over the elapsed countdown', async () => {
      const repository = new MockPaymentRepository();
      const checkout = await enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'paid' };
      checkout.dispatch({ type: 'COUNTDOWN_ELAPSED' });
      await flushMicrotasks();

      expect(checkout.state.type).toBe('paid');
    });

    it('should poll again automatically after 3s while awaitingPayment', async () => {
      const repository = new MockPaymentRepository();
      const checkout = await enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'paid' };
      await jest.advanceTimersByTimeAsync(3000);

      expect(checkout.state.type).toBe('paid');
    });
  });

  it('should skip the name prompt retrying from expired straight into creatingPayment', async () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository, 'Budi');
    checkout.dispatch({ type: 'ASK_NAME' });
    checkout.dispatch({ type: 'SUBMIT_NAME' });
    await flushMicrotasks();

    repository.payment = { ...repository.payment, status: 'expired' };
    checkout.dispatch({ type: 'POLL' });
    await flushMicrotasks();
    expect(checkout.state.type).toBe('expired');

    repository.payment = { ...repository.payment, status: 'pending' };
    checkout.dispatch({ type: 'SUBMIT_NAME' });
    expect(checkout.state.type).toBe('creatingPayment');

    await flushMicrotasks();
    expect(checkout.state.type).toBe('awaitingPayment');
  });
});
