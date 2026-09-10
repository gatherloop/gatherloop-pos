import {
  OrderStatusUsecase,
  OrderStatusState,
  OrderStatusAction,
  OrderStatusParams,
} from './orderStatus';
import { MockPaymentRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const createTester = (repository: MockPaymentRepository, reference: string) =>
  new UsecaseTester<
    OrderStatusUsecase,
    OrderStatusState,
    OrderStatusAction,
    OrderStatusParams
  >(new OrderStatusUsecase(repository, { reference }));

describe('OrderStatusUsecase', () => {
  it('should transition idle → loading → loaded on a known reference', async () => {
    const repository = new MockPaymentRepository();
    const orderStatus = createTester(repository, repository.payment.reference);

    expect(orderStatus.state).toEqual({
      type: 'loading',
      reference: repository.payment.reference,
      payment: null,
      errorMessage: null,
    });

    await flushPromises();
    expect(orderStatus.state).toEqual({
      type: 'loaded',
      reference: repository.payment.reference,
      payment: repository.payment,
      errorMessage: null,
    });
  });

  it('should transition idle → loading → notFound on an unknown reference', async () => {
    const repository = new MockPaymentRepository();
    const orderStatus = createTester(repository, 'UNKNOWNREF');

    await flushPromises();
    expect(orderStatus.state).toEqual({
      type: 'notFound',
      reference: 'UNKNOWNREF',
      payment: null,
      errorMessage: null,
    });
  });

  it('should transition idle → loading → error → loading → loaded on retry', async () => {
    const repository = new MockPaymentRepository();
    repository.setShouldFailFetch(true);
    const orderStatus = createTester(repository, repository.payment.reference);

    await flushPromises();
    expect(orderStatus.state).toEqual({
      type: 'error',
      reference: repository.payment.reference,
      payment: null,
      errorMessage: 'Failed to fetch order status',
    });

    repository.setShouldFailFetch(false);
    orderStatus.dispatch({ type: 'FETCH' });
    expect(orderStatus.state).toEqual({
      type: 'loading',
      reference: repository.payment.reference,
      payment: null,
      errorMessage: null,
    });

    await flushPromises();
    expect(orderStatus.state).toEqual({
      type: 'loaded',
      reference: repository.payment.reference,
      payment: repository.payment,
      errorMessage: null,
    });
  });

  // P6 in docs/trd-order-app-composition-and-ssr.md: a page's
  // getServerSideProps already fetched the payment, so the usecase starts
  // seeded and never fetches.
  it('starts loaded and never fetches when seeded with a payment', async () => {
    const repository = new MockPaymentRepository();
    const fetchSpy = jest.spyOn(repository, 'fetchPayment');
    const reference = repository.payment.reference;

    const orderStatus = new UsecaseTester<
      OrderStatusUsecase,
      OrderStatusState,
      OrderStatusAction,
      OrderStatusParams
    >(new OrderStatusUsecase(repository, { reference, payment: repository.payment }));

    expect(orderStatus.state).toEqual({
      type: 'loaded',
      reference,
      payment: repository.payment,
      errorMessage: null,
    });

    await flushPromises();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Seeded with `payment: null` (the reference resolved server-side to "not
  // found") — distinct from `undefined`, which keeps the client-only path.
  it('starts notFound and never fetches when seeded with a null payment', async () => {
    const repository = new MockPaymentRepository();
    const fetchSpy = jest.spyOn(repository, 'fetchPayment');
    const reference = 'UNKNOWNREF';

    const orderStatus = new UsecaseTester<
      OrderStatusUsecase,
      OrderStatusState,
      OrderStatusAction,
      OrderStatusParams
    >(new OrderStatusUsecase(repository, { reference, payment: null }));

    expect(orderStatus.state).toEqual({
      type: 'notFound',
      reference,
      payment: null,
      errorMessage: null,
    });

    await flushPromises();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
