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

  it('should transition idle → askingName → creatingPayment → created', async () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_NAME' });
    expect(checkout.state.type).toBe('askingName');

    checkout.dispatch({ type: 'CHANGE_NAME', name: 'Budi' });
    checkout.dispatch({ type: 'SUBMIT_NAME' });
    expect(checkout.state.type).toBe('creatingPayment');
    expect(checkout.state.customerName).toBe('Budi');

    await flushMicrotasks();
    expect(checkout.state.type).toBe('created');
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
    expect(checkout.state.type).toBe('created');
  });

  it('should stay at created and ignore further actions once the payment exists', async () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository, 'Budi');
    checkout.dispatch({ type: 'ASK_NAME' });
    checkout.dispatch({ type: 'SUBMIT_NAME' });
    await flushMicrotasks();

    expect(checkout.state.type).toBe('created');
    const { payment } = checkout.state;

    checkout.dispatch({ type: 'ASK_NAME' });

    expect(checkout.state.type).toBe('created');
    expect(checkout.state.payment).toEqual(payment);
  });
});
