import {
  OrderStatusUsecase,
  OrderStatusState,
  OrderStatusAction,
  OrderStatusParams,
} from './orderStatus';
import { MockPaymentRepository } from '../../data/mock';
import { Payment } from '../entities';
import { UsecaseTester } from '../../utils/usecase';

const flushMicrotasks = () => jest.advanceTimersByTimeAsync(0);

const createTester = (repository: MockPaymentRepository, reference: string) =>
  new UsecaseTester<
    OrderStatusUsecase,
    OrderStatusState,
    OrderStatusAction,
    OrderStatusParams
  >(new OrderStatusUsecase(repository, { reference }));

const createSeededTester = (
  repository: MockPaymentRepository,
  payment: Payment | null
) =>
  new UsecaseTester<
    OrderStatusUsecase,
    OrderStatusState,
    OrderStatusAction,
    OrderStatusParams
  >(
    new OrderStatusUsecase(repository, {
      reference: payment?.reference ?? 'UNKNOWNREF',
      payment,
    })
  );

describe('OrderStatusUsecase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should transition idle → loading → awaitingPayment on a known pending reference', async () => {
    const repository = new MockPaymentRepository();
    const orderStatus = createTester(repository, repository.payment.reference);

    expect(orderStatus.state).toEqual({
      type: 'loading',
      reference: repository.payment.reference,
      payment: null,
      errorMessage: null,
      isPolling: false,
    });

    await flushMicrotasks();
    expect(orderStatus.state).toEqual({
      type: 'awaitingPayment',
      reference: repository.payment.reference,
      payment: repository.payment,
      errorMessage: null,
      isPolling: false,
    });
  });

  it('should transition idle → loading → notFound on an unknown reference', async () => {
    const repository = new MockPaymentRepository();
    const orderStatus = createTester(repository, 'UNKNOWNREF');

    await flushMicrotasks();
    expect(orderStatus.state).toEqual({
      type: 'notFound',
      reference: 'UNKNOWNREF',
      payment: null,
      errorMessage: null,
      isPolling: false,
    });
  });

  it('should transition idle → loading → error → loading → awaitingPayment on retry', async () => {
    const repository = new MockPaymentRepository();
    repository.setShouldFailFetch(true);
    const orderStatus = createTester(repository, repository.payment.reference);

    await flushMicrotasks();
    expect(orderStatus.state).toEqual({
      type: 'error',
      reference: repository.payment.reference,
      payment: null,
      errorMessage: 'Failed to fetch order status',
      isPolling: false,
    });

    repository.setShouldFailFetch(false);
    orderStatus.dispatch({ type: 'FETCH' });
    expect(orderStatus.state).toEqual({
      type: 'loading',
      reference: repository.payment.reference,
      payment: null,
      errorMessage: null,
      isPolling: false,
    });

    await flushMicrotasks();
    expect(orderStatus.state).toEqual({
      type: 'awaitingPayment',
      reference: repository.payment.reference,
      payment: repository.payment,
      errorMessage: null,
      isPolling: false,
    });
  });

  it('starts awaitingPayment and never fetches when seeded with a pending payment', async () => {
    const repository = new MockPaymentRepository();
    const fetchSpy = jest.spyOn(repository, 'fetchPayment');

    const orderStatus = createSeededTester(repository, repository.payment);

    expect(orderStatus.state).toEqual({
      type: 'awaitingPayment',
      reference: repository.payment.reference,
      payment: repository.payment,
      errorMessage: null,
      isPolling: false,
    });

    await flushMicrotasks();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('starts loaded and never fetches when seeded with a paid payment', async () => {
    const repository = new MockPaymentRepository();
    repository.payment = { ...repository.payment, status: 'paid' };
    const fetchSpy = jest.spyOn(repository, 'fetchPayment');

    const orderStatus = createSeededTester(repository, repository.payment);

    expect(orderStatus.state).toEqual({
      type: 'loaded',
      reference: repository.payment.reference,
      payment: repository.payment,
      errorMessage: null,
      isPolling: false,
    });

    await flushMicrotasks();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('starts expired and never fetches when seeded with an expired or failed payment', async () => {
    const repository = new MockPaymentRepository();
    repository.payment = { ...repository.payment, status: 'expired' };
    const fetchSpy = jest.spyOn(repository, 'fetchPayment');

    const orderStatus = createSeededTester(repository, repository.payment);

    expect(orderStatus.state).toEqual({
      type: 'expired',
      reference: repository.payment.reference,
      payment: repository.payment,
      errorMessage: null,
      isPolling: false,
    });

    await flushMicrotasks();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('starts notFound and never fetches when seeded with a null payment', async () => {
    const repository = new MockPaymentRepository();
    const fetchSpy = jest.spyOn(repository, 'fetchPayment');

    const orderStatus = createSeededTester(repository, null);

    expect(orderStatus.state).toEqual({
      type: 'notFound',
      reference: 'UNKNOWNREF',
      payment: null,
      errorMessage: null,
      isPolling: false,
    });

    await flushMicrotasks();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe('awaitingPayment', () => {
    const enterAwaitingPayment = (repository: MockPaymentRepository) =>
      createSeededTester(repository, repository.payment);

    it('should transition to loaded on a POLL that reports paid', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'paid' };
      orderStatus.dispatch({ type: 'POLL' });
      await flushMicrotasks();

      expect(orderStatus.state.type).toBe('loaded');
      expect(orderStatus.state.payment?.status).toBe('paid');
    });

    it('should keep the QR on screen on a poll error', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.setShouldFailFetch(true);
      orderStatus.dispatch({ type: 'POLL' });
      expect(orderStatus.state.isPolling).toBe(true);

      await flushMicrotasks();
      expect(orderStatus.state.type).toBe('awaitingPayment');
      expect(orderStatus.state.isPolling).toBe(false);
      expect(orderStatus.state.payment).toEqual(repository.payment);
    });

    it('should transition to expired on a server status', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'expired' };
      orderStatus.dispatch({ type: 'POLL' });
      await flushMicrotasks();

      expect(orderStatus.state.type).toBe('expired');
    });

    it('should issue one final poll on COUNTDOWN_ELAPSED without expiring on its own', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'expired' };
      orderStatus.dispatch({ type: 'COUNTDOWN_ELAPSED' });

      expect(orderStatus.state.type).toBe('awaitingPayment');
      expect(orderStatus.state.isPolling).toBe(true);

      await flushMicrotasks();
      expect(orderStatus.state.type).toBe('expired');
    });

    it('should let a paid result from the final poll win over the elapsed countdown', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'paid' };
      orderStatus.dispatch({ type: 'COUNTDOWN_ELAPSED' });
      await flushMicrotasks();

      expect(orderStatus.state.type).toBe('loaded');
    });

    it('should poll again automatically after 3s while awaitingPayment', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'paid' };
      await jest.advanceTimersByTimeAsync(3000);

      expect(orderStatus.state.type).toBe('loaded');
    });

    it('should clear the poll interval once a terminal state is reached', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = { ...repository.payment, status: 'paid' };
      orderStatus.dispatch({ type: 'POLL' });
      await flushMicrotasks();
      expect(orderStatus.state.type).toBe('loaded');

      const fetchSpy = jest.spyOn(repository, 'fetchPayment');
      await jest.advanceTimersByTimeAsync(3000);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
