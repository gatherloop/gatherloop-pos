import {
  CheckoutUsecase,
  CheckoutAction,
  CheckoutState,
  CheckoutParams,
} from './checkout';
import { MockPaymentRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';
import { WhatsappNumberRejectedError } from '../repositories';

const flushMicrotasks = () => jest.advanceTimersByTimeAsync(0);

const createTester = (
  repository: MockPaymentRepository,
  params: CheckoutParams = {}
) =>
  new UsecaseTester<CheckoutUsecase, CheckoutState, CheckoutAction, CheckoutParams>(
    new CheckoutUsecase(repository, params)
  );

describe('CheckoutUsecase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should transition idle → askingDetails → creatingPayment → created', async () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    expect(checkout.state.type).toBe('askingDetails');

    checkout.dispatch({ type: 'CHANGE_NAME', name: 'Budi' });
    checkout.dispatch({
      type: 'CHANGE_WHATSAPP_NUMBER',
      whatsappNumber: '0812-3456-7890',
    });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    expect(checkout.state.type).toBe('creatingPayment');
    expect(checkout.state.customerName).toBe('Budi');
    expect(checkout.state.whatsappNumber).toBe('0812-3456-7890');

    await flushMicrotasks();
    expect(checkout.state.type).toBe('created');
    expect(checkout.state.payment).toEqual(repository.payment);
  });

  it('should hold an empty name at askingDetails with an error', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_NAME', name: '   ' });
    checkout.dispatch({
      type: 'CHANGE_WHATSAPP_NUMBER',
      whatsappNumber: '081234567890',
    });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });

    expect(checkout.state.type).toBe('askingDetails');
    expect(checkout.state.nameErrorMessage).toBe('Nama tidak boleh kosong');
  });

  it('should hold an over-long name at askingDetails with an error', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_NAME', name: 'a'.repeat(61) });
    checkout.dispatch({
      type: 'CHANGE_WHATSAPP_NUMBER',
      whatsappNumber: '081234567890',
    });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });

    expect(checkout.state.type).toBe('askingDetails');
    expect(checkout.state.nameErrorMessage).toBe('Nama maksimal 60 karakter');
  });

  it('should hold an empty WhatsApp number at askingDetails with an error', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_NAME', name: 'Budi' });
    checkout.dispatch({ type: 'CHANGE_WHATSAPP_NUMBER', whatsappNumber: '   ' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });

    expect(checkout.state.type).toBe('askingDetails');
    expect(checkout.state.whatsappNumberErrorMessage).toBe(
      'Nomor WhatsApp tidak boleh kosong'
    );
  });

  it('should hold an invalid WhatsApp number at askingDetails with an error', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_NAME', name: 'Budi' });
    checkout.dispatch({ type: 'CHANGE_WHATSAPP_NUMBER', whatsappNumber: '12345' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });

    expect(checkout.state.type).toBe('askingDetails');
    expect(checkout.state.whatsappNumberErrorMessage).toBe(
      'Nomor WhatsApp tidak valid. Mohon periksa kembali.'
    );
  });

  it('should validate name and WhatsApp number together, setting only the field that is invalid', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_NAME', name: 'Budi' });
    checkout.dispatch({ type: 'CHANGE_WHATSAPP_NUMBER', whatsappNumber: '12345' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });

    expect(checkout.state.nameErrorMessage).toBeNull();
    expect(checkout.state.whatsappNumberErrorMessage).toBe(
      'Nomor WhatsApp tidak valid. Mohon periksa kembali.'
    );
  });

  it('should return to idle having created nothing on CANCEL_DETAILS', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_NAME', name: 'Budi' });
    checkout.dispatch({
      type: 'CHANGE_WHATSAPP_NUMBER',
      whatsappNumber: '081234567890',
    });
    checkout.dispatch({ type: 'CHANGE_METHOD', method: 'cash' });
    checkout.dispatch({ type: 'CANCEL_DETAILS' });

    expect(checkout.state.type).toBe('idle');
    expect(checkout.state.payment).toBeNull();
    expect(checkout.state.customerName).toBe('Budi');
    expect(checkout.state.whatsappNumber).toBe('081234567890');
    expect(checkout.state.method).toBe('cash');
  });

  it('should still require an explicit submit when the name and number are seeded', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository, {
      customerName: 'Budi',
      customerWhatsappNumber: '0812345678',
    });

    expect(checkout.state.type).toBe('idle');
    expect(checkout.state.customerName).toBe('Budi');
    expect(checkout.state.whatsappNumber).toBe('0812345678');
  });

  it('should reach creatingPayment keeping the raw number as typed, and submit the normalized number', async () => {
    const repository = new MockPaymentRepository();
    const checkoutSpy = jest.spyOn(repository, 'checkout');
    const checkout = createTester(repository, {
      customerName: 'Budi',
      customerWhatsappNumber: '0812345678',
    });

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    expect(checkout.state.type).toBe('creatingPayment');
    expect(checkout.state.whatsappNumber).toBe('0812345678');

    await flushMicrotasks();
    expect(checkoutSpy).toHaveBeenCalledWith({
      customerName: 'Budi',
      whatsappNumber: '62812345678',
      method: 'qris',
      diningOption: 'dine_in',
    });
  });

  it('should default the method to qris', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    expect(checkout.state.method).toBe('qris');
  });

  it('should accept CHANGE_METHOD in askingDetails', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_METHOD', method: 'cash' });

    expect(checkout.state.method).toBe('cash');
  });

  it('should ignore CHANGE_METHOD outside askingDetails', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'CHANGE_METHOD', method: 'cash' });

    expect(checkout.state.type).toBe('idle');
    expect(checkout.state.method).toBe('qris');
  });

  it('should default diningOption to dine_in', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    expect(checkout.state.diningOption).toBe('dine_in');
  });

  it('should accept CHANGE_DINING_OPTION in askingDetails', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_DINING_OPTION', diningOption: 'takeaway' });

    expect(checkout.state.diningOption).toBe('takeaway');
  });

  it('should ignore CHANGE_DINING_OPTION outside askingDetails', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'CHANGE_DINING_OPTION', diningOption: 'takeaway' });

    expect(checkout.state.type).toBe('idle');
    expect(checkout.state.diningOption).toBe('dine_in');
  });

  it('should keep diningOption when CANCEL_DETAILS returns to idle, and again on ASK_DETAILS', () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository);

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_DINING_OPTION', diningOption: 'takeaway' });
    checkout.dispatch({ type: 'CANCEL_DETAILS' });

    expect(checkout.state.type).toBe('idle');
    expect(checkout.state.diningOption).toBe('takeaway');

    checkout.dispatch({ type: 'ASK_DETAILS' });

    expect(checkout.state.type).toBe('askingDetails');
    expect(checkout.state.diningOption).toBe('takeaway');
  });

  it('should submit a takeaway checkout with the selected dining option', async () => {
    const repository = new MockPaymentRepository();
    const checkoutSpy = jest.spyOn(repository, 'checkout');
    const checkout = createTester(repository, {
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_DINING_OPTION', diningOption: 'takeaway' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    await flushMicrotasks();

    expect(checkoutSpy).toHaveBeenCalledWith({
      customerName: 'Budi',
      whatsappNumber: '6281234567890',
      method: 'qris',
      diningOption: 'takeaway',
    });
  });

  it('should submit a cash checkout with the selected method', async () => {
    const repository = new MockPaymentRepository();
    const checkoutSpy = jest.spyOn(repository, 'checkout');
    const checkout = createTester(repository, {
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'CHANGE_METHOD', method: 'cash' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    await flushMicrotasks();

    expect(checkoutSpy).toHaveBeenCalledWith({
      customerName: 'Budi',
      whatsappNumber: '6281234567890',
      method: 'cash',
      diningOption: 'dine_in',
    });
    expect(checkout.state.type).toBe('created');
    expect(checkout.state.payment?.method).toBe('cash');
  });

  it('should transition creatingPayment → error and retry', async () => {
    const repository = new MockPaymentRepository();
    repository.setShouldFailCheckout(true);
    const checkout = createTester(repository, {
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    await flushMicrotasks();

    expect(checkout.state.type).toBe('error');
    expect(checkout.state.errorMessage).toBe('Failed to create payment');

    repository.setShouldFailCheckout(false);
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    expect(checkout.state.type).toBe('creatingPayment');

    await flushMicrotasks();
    expect(checkout.state.type).toBe('created');
  });

  it('should return to askingDetails with the not-registered message and the raw number intact, creating nothing', async () => {
    const repository = new MockPaymentRepository();
    repository.setRejectedWhatsappNumbers(['6281234567890']);
    const checkout = createTester(repository, {
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    expect(checkout.state.type).toBe('creatingPayment');

    await flushMicrotasks();

    expect(checkout.state.type).toBe('askingDetails');
    expect(checkout.state.whatsappNumber).toBe('081234567890');
    expect(checkout.state.whatsappNumberErrorMessage).toBe(
      'Nomor WhatsApp tidak terdaftar di WhatsApp. Mohon periksa kembali.'
    );
    expect(checkout.state.payment).toBeNull();
  });

  it('should return to askingDetails with the invalid-format message when the server rejects the number as invalid', async () => {
    const repository = new MockPaymentRepository();
    jest
      .spyOn(repository, 'checkout')
      .mockRejectedValue(new WhatsappNumberRejectedError('invalid'));
    const checkout = createTester(repository, {
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    await flushMicrotasks();

    expect(checkout.state.type).toBe('askingDetails');
    expect(checkout.state.whatsappNumberErrorMessage).toBe(
      'Nomor WhatsApp tidak valid. Mohon periksa kembali.'
    );
  });

  it('should clear the WhatsApp number error as soon as the field changes', async () => {
    const repository = new MockPaymentRepository();
    repository.setRejectedWhatsappNumbers(['6281234567890']);
    const checkout = createTester(repository, {
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });

    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    await flushMicrotasks();
    expect(checkout.state.whatsappNumberErrorMessage).not.toBeNull();

    checkout.dispatch({
      type: 'CHANGE_WHATSAPP_NUMBER',
      whatsappNumber: '081234567899',
    });

    expect(checkout.state.whatsappNumberErrorMessage).toBeNull();
  });

  it('should stay at created and ignore further actions once the payment exists', async () => {
    const repository = new MockPaymentRepository();
    const checkout = createTester(repository, {
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });
    checkout.dispatch({ type: 'ASK_DETAILS' });
    checkout.dispatch({ type: 'SUBMIT_DETAILS' });
    await flushMicrotasks();

    expect(checkout.state.type).toBe('created');
    const { payment } = checkout.state;

    checkout.dispatch({ type: 'ASK_DETAILS' });

    expect(checkout.state.type).toBe('created');
    expect(checkout.state.payment).toEqual(payment);
  });
});
