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

  it('should transition loading → preparing → (poll) → ready and stop polling once ready', async () => {
    const repository = new MockPaymentRepository();
    repository.payment = {
      ...repository.payment,
      status: 'paid',
      fulfillmentStatus: 'preparing',
    };
    const orderStatus = createTester(repository, repository.payment.reference);

    await flushMicrotasks();
    expect(orderStatus.state.type).toBe('preparing');

    repository.payment = { ...repository.payment, fulfillmentStatus: 'ready' };
    await jest.advanceTimersByTimeAsync(10_000);

    expect(orderStatus.state.type).toBe('ready');

    const fetchSpy = jest.spyOn(repository, 'fetchPayment');
    await jest.advanceTimersByTimeAsync(10_000);
    expect(fetchSpy).not.toHaveBeenCalled();
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

  it('starts preparing and never fetches when seeded with a paid, not-yet-ready payment', async () => {
    const repository = new MockPaymentRepository();
    repository.payment = {
      ...repository.payment,
      status: 'paid',
      fulfillmentStatus: 'preparing',
    };
    const fetchSpy = jest.spyOn(repository, 'fetchPayment');

    const orderStatus = createSeededTester(repository, repository.payment);

    expect(orderStatus.state).toEqual({
      type: 'preparing',
      reference: repository.payment.reference,
      payment: repository.payment,
      errorMessage: null,
      isPolling: false,
    });

    await flushMicrotasks();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('starts ready and never fetches when seeded with a paid, ready payment', async () => {
    const repository = new MockPaymentRepository();
    repository.payment = {
      ...repository.payment,
      status: 'paid',
      fulfillmentStatus: 'ready',
    };
    const fetchSpy = jest.spyOn(repository, 'fetchPayment');

    const orderStatus = createSeededTester(repository, repository.payment);

    expect(orderStatus.state).toEqual({
      type: 'ready',
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

    it('should transition to preparing on a POLL that reports paid but not yet ready', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = {
        ...repository.payment,
        status: 'paid',
        fulfillmentStatus: 'preparing',
      };
      orderStatus.dispatch({ type: 'POLL' });
      await flushMicrotasks();

      expect(orderStatus.state.type).toBe('preparing');
      expect(orderStatus.state.payment?.status).toBe('paid');
    });

    it('should transition straight to ready on a POLL that reports paid and already ready', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = {
        ...repository.payment,
        status: 'paid',
        fulfillmentStatus: 'ready',
      };
      orderStatus.dispatch({ type: 'POLL' });
      await flushMicrotasks();

      expect(orderStatus.state.type).toBe('ready');
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

      repository.payment = {
        ...repository.payment,
        status: 'paid',
        fulfillmentStatus: 'preparing',
      };
      orderStatus.dispatch({ type: 'COUNTDOWN_ELAPSED' });
      await flushMicrotasks();

      expect(orderStatus.state.type).toBe('preparing');
    });

    it('should poll again automatically after 3s while awaitingPayment', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = {
        ...repository.payment,
        status: 'paid',
        fulfillmentStatus: 'preparing',
      };
      await jest.advanceTimersByTimeAsync(3000);

      expect(orderStatus.state.type).toBe('preparing');
    });

    it('should switch from the 3s payment poll to the 10s preparation poll, not run both', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterAwaitingPayment(repository);

      repository.payment = {
        ...repository.payment,
        status: 'paid',
        fulfillmentStatus: 'preparing',
      };
      await jest.advanceTimersByTimeAsync(3000);
      expect(orderStatus.state.type).toBe('preparing');

      const fetchSpy = jest.spyOn(repository, 'fetchPayment');
      await jest.advanceTimersByTimeAsync(6000);
      expect(fetchSpy).not.toHaveBeenCalled();

      repository.payment = { ...repository.payment, fulfillmentStatus: 'ready' };
      await jest.advanceTimersByTimeAsync(4000);
      expect(orderStatus.state.type).toBe('ready');
    });
  });

  describe('preparing', () => {
    const enterPreparing = (repository: MockPaymentRepository) => {
      repository.payment = {
        ...repository.payment,
        status: 'paid',
        fulfillmentStatus: 'preparing',
      };
      return createSeededTester(repository, repository.payment);
    };

    it('should stay preparing on a POLL that still reports preparing', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterPreparing(repository);

      orderStatus.dispatch({ type: 'POLL' });
      await flushMicrotasks();

      expect(orderStatus.state.type).toBe('preparing');
    });

    it('should transition to ready on a POLL that reports ready', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterPreparing(repository);

      repository.payment = { ...repository.payment, fulfillmentStatus: 'ready' };
      orderStatus.dispatch({ type: 'POLL' });
      await flushMicrotasks();

      expect(orderStatus.state.type).toBe('ready');
    });

    it('should keep preparing on a poll error', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterPreparing(repository);

      repository.setShouldFailFetch(true);
      orderStatus.dispatch({ type: 'POLL' });
      expect(orderStatus.state.isPolling).toBe(true);

      await flushMicrotasks();
      expect(orderStatus.state.type).toBe('preparing');
      expect(orderStatus.state.isPolling).toBe(false);
    });

    it('should poll again automatically after 10s while preparing', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterPreparing(repository);

      repository.payment = { ...repository.payment, fulfillmentStatus: 'ready' };
      await jest.advanceTimersByTimeAsync(10_000);

      expect(orderStatus.state.type).toBe('ready');
    });

    it('should not poll again before 10s has elapsed', async () => {
      const repository = new MockPaymentRepository();
      enterPreparing(repository);

      const fetchSpy = jest.spyOn(repository, 'fetchPayment');
      await jest.advanceTimersByTimeAsync(9999);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should clear the poll interval once ready is reached (terminal, D10)', async () => {
      const repository = new MockPaymentRepository();
      const orderStatus = enterPreparing(repository);

      repository.payment = { ...repository.payment, fulfillmentStatus: 'ready' };
      orderStatus.dispatch({ type: 'POLL' });
      await flushMicrotasks();
      expect(orderStatus.state.type).toBe('ready');

      const fetchSpy = jest.spyOn(repository, 'fetchPayment');
      await jest.advanceTimersByTimeAsync(10_000);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
