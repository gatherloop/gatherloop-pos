import {
  PaymentCancelUsecase,
  PaymentCancelState,
  PaymentCancelAction,
  PaymentCancelParams,
} from './paymentCancel';
import { MockPaymentRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

const createTester = (repository: MockPaymentRepository) =>
  new UsecaseTester<
    PaymentCancelUsecase,
    PaymentCancelState,
    PaymentCancelAction,
    PaymentCancelParams
  >(
    new PaymentCancelUsecase(repository, {
      reference: repository.payment.reference,
      method: repository.payment.method,
    })
  );

describe('PaymentCancelUsecase', () => {
  it('starts idle', () => {
    const repository = new MockPaymentRepository();
    const paymentCancel = createTester(repository);

    expect(paymentCancel.state).toEqual({
      type: 'idle',
      reference: repository.payment.reference,
      method: repository.payment.method,
      result: null,
      errorMessage: null,
    });
  });

  it('should transition idle → confirming → idle on request then dismiss, without cancelling anything', async () => {
    const repository = new MockPaymentRepository();
    const cancelSpy = jest.spyOn(repository, 'cancelPayment');
    const paymentCancel = createTester(repository);

    paymentCancel.dispatch({ type: 'REQUEST' });
    expect(paymentCancel.state.type).toBe('confirming');

    paymentCancel.dispatch({ type: 'DISMISS' });
    expect(paymentCancel.state.type).toBe('idle');

    await flushPromises();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('should transition confirming → cancelling → settled with a cancelled result on confirm', async () => {
    const repository = new MockPaymentRepository();
    const paymentCancel = createTester(repository);

    paymentCancel.dispatch({ type: 'REQUEST' });
    paymentCancel.dispatch({ type: 'CONFIRM' });
    expect(paymentCancel.state.type).toBe('cancelling');

    await flushPromises();
    expect(paymentCancel.state.type).toBe('settled');
    expect(paymentCancel.state.result?.status).toBe('cancelled');
    expect(paymentCancel.state.result?.cancelReason).toBe('guest');
  });

  it('should settle with a paid result when the server answers paid', async () => {
    const repository = new MockPaymentRepository();
    repository.payment = { ...repository.payment, status: 'paid' };
    const paymentCancel = createTester(repository);

    paymentCancel.dispatch({ type: 'REQUEST' });
    paymentCancel.dispatch({ type: 'CONFIRM' });
    await flushPromises();

    expect(paymentCancel.state.type).toBe('settled');
    expect(paymentCancel.state.result?.status).toBe('paid');
  });

  it('should settle with an expired result when the server answers expired', async () => {
    const repository = new MockPaymentRepository();
    repository.payment = { ...repository.payment, status: 'expired' };
    const paymentCancel = createTester(repository);

    paymentCancel.dispatch({ type: 'REQUEST' });
    paymentCancel.dispatch({ type: 'CONFIRM' });
    await flushPromises();

    expect(paymentCancel.state.type).toBe('settled');
    expect(paymentCancel.state.result?.status).toBe('expired');
  });

  it('should transition to error with a message on a failed cancel, and reopen on a fresh request', async () => {
    const repository = new MockPaymentRepository();
    repository.setShouldFailCancel(true);
    const paymentCancel = createTester(repository);

    paymentCancel.dispatch({ type: 'REQUEST' });
    paymentCancel.dispatch({ type: 'CONFIRM' });
    await flushPromises();

    expect(paymentCancel.state).toEqual({
      type: 'error',
      reference: repository.payment.reference,
      method: repository.payment.method,
      result: null,
      errorMessage: 'Gagal membatalkan pembayaran. Silakan coba lagi.',
    });

    paymentCancel.dispatch({ type: 'REQUEST' });
    expect(paymentCancel.state.type).toBe('confirming');
    expect(paymentCancel.state.errorMessage).toBeNull();
  });

  it('should ignore CONFIRM outside confirming', () => {
    const repository = new MockPaymentRepository();
    const paymentCancel = createTester(repository);

    paymentCancel.dispatch({ type: 'CONFIRM' });
    expect(paymentCancel.state.type).toBe('idle');
  });
});
