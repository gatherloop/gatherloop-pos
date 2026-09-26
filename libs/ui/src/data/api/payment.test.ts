import { WhatsappNumberRejectedError } from '../../domain/repositories/payment';
import { SessionRepository } from '../../domain/repositories/session';
import { ApiPaymentRepository } from './payment';

const paymentFindByPartnerReferenceNo = jest.fn().mockResolvedValue({
  data: {
    partnerReferenceNo: 'ORD1',
    status: 'paid',
    method: 'qris',
    amount: 10000,
    qrContent: null,
    expiredAt: null,
    paidAt: null,
    customerName: 'Andi',
    tableLabel: 'Meja 4',
    items: [],
    transactionNumber: 1,
    fulfillmentStatus: 'preparing',
    canCancel: false,
  },
});

const paymentCheckout = jest.fn().mockResolvedValue({
  data: {
    partnerReferenceNo: 'ORD1',
    status: 'pending',
    method: 'qris',
    amount: 10000,
    qrContent: 'qr-content',
    expiredAt: null,
    paidAt: null,
    customerName: 'Andi',
    tableLabel: 'Meja 4',
    items: [],
    transactionNumber: 1,
    fulfillmentStatus: 'preparing',
    canCancel: false,
  },
});

const paymentCancel = jest.fn().mockResolvedValue({
  data: {
    partnerReferenceNo: 'ORD1',
    status: 'cancelled',
    method: 'qris',
    amount: 10000,
    qrContent: 'qr-content',
    expiredAt: null,
    paidAt: null,
    customerName: 'Andi',
    tableLabel: 'Meja 4',
    items: [],
    transactionNumber: 1,
    fulfillmentStatus: 'preparing',
    canCancel: false,
    cancelReason: 'guest',
  },
});

// eslint-disable-next-line @nx/enforce-module-boundaries
jest.mock('../../../../api-contract/src', () => ({
  paymentFindByPartnerReferenceNo: (...args: unknown[]) =>
    paymentFindByPartnerReferenceNo(...args),
  paymentCheckout: (...args: unknown[]) => paymentCheckout(...args),
  paymentCancel: (...args: unknown[]) => paymentCancel(...args),
  paymentList: jest.fn(),
}));

const mockSessionRepository: SessionRepository = {
  getSessionId: () => 'session-1',
  getTableCode: () => null,
  setTableCode: () => undefined,
};

describe('ApiPaymentRepository', () => {
  beforeEach(() => {
    paymentFindByPartnerReferenceNo.mockClear();
    paymentCheckout.mockClear();
    paymentCancel.mockClear();
  });

  it('checks out with the WhatsApp number when given', async () => {
    const repository = new ApiPaymentRepository(mockSessionRepository);

    await repository.checkout({
      customerName: 'Andi',
      method: 'qris',
      whatsappNumber: '6281234567890',
    });

    expect(paymentCheckout).toHaveBeenCalledWith(
      {
        customerName: 'Andi',
        method: 'qris',
        customerWhatsappNumber: '6281234567890',
      },
      expect.anything()
    );
  });

  it('checks out without a WhatsApp number when it is not given', async () => {
    const repository = new ApiPaymentRepository(mockSessionRepository);

    await repository.checkout({ customerName: 'Andi', method: 'qris' });

    expect(paymentCheckout).toHaveBeenCalledWith(
      {
        customerName: 'Andi',
        method: 'qris',
        customerWhatsappNumber: undefined,
        diningOption: undefined,
      },
      expect.anything()
    );
  });

  it('checks out with the dining option when given', async () => {
    const repository = new ApiPaymentRepository(mockSessionRepository);

    await repository.checkout({
      customerName: 'Andi',
      method: 'qris',
      diningOption: 'takeaway',
    });

    expect(paymentCheckout).toHaveBeenCalledWith(
      {
        customerName: 'Andi',
        method: 'qris',
        customerWhatsappNumber: undefined,
        diningOption: 'takeaway',
      },
      expect.anything()
    );
  });

  it('does not send X-Order-Access-Key when constructed without a key', async () => {
    const repository = new ApiPaymentRepository(mockSessionRepository);

    await repository.fetchPayment('ORD1');

    expect(paymentFindByPartnerReferenceNo).toHaveBeenCalledWith(
      'ORD1',
      undefined,
      expect.anything()
    );
  });

  it('sends X-Order-Access-Key when constructed with a key', async () => {
    const repository = new ApiPaymentRepository(
      mockSessionRepository,
      'q3Vd0bX9pL2sR8tY1wZa7c'
    );

    await repository.fetchPayment('ORD1');

    expect(paymentFindByPartnerReferenceNo).toHaveBeenCalledWith(
      'ORD1',
      { 'X-Order-Access-Key': 'q3Vd0bX9pL2sR8tY1wZa7c' },
      expect.anything()
    );
  });

  it('maps canCancel and cancelReason onto the payment', async () => {
    const repository = new ApiPaymentRepository(mockSessionRepository);

    const payment = await repository.cancelPayment('ORD1');

    expect(payment.canCancel).toBe(false);
    expect(payment.cancelReason).toBe('guest');
  });

  it('defaults cancelReason to null when the API omits it', async () => {
    const repository = new ApiPaymentRepository(mockSessionRepository);

    const payment = await repository.fetchPayment('ORD1');

    expect(payment.cancelReason).toBeNull();
  });

  it('posts to paymentCancel with the session id, never the access key', async () => {
    const repository = new ApiPaymentRepository(
      mockSessionRepository,
      'q3Vd0bX9pL2sR8tY1wZa7c'
    );

    await repository.cancelPayment('ORD1');

    expect(paymentCancel).toHaveBeenCalledWith(
      'ORD1',
      expect.objectContaining({
        headers: { 'X-Session-Id': 'session-1' },
      })
    );
  });

  it('throws WhatsappNumberRejectedError with reason "invalid" on a 400 whatsapp_number_invalid', async () => {
    paymentCheckout.mockRejectedValueOnce(
      axiosErrorWithReason('whatsapp_number_invalid')
    );
    const repository = new ApiPaymentRepository(mockSessionRepository);

    const promise = repository.checkout({
      customerName: 'Andi',
      method: 'qris',
      whatsappNumber: '08abc',
    });

    await expect(promise).rejects.toThrow(WhatsappNumberRejectedError);
    await expect(promise).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('throws WhatsappNumberRejectedError with reason "not_registered" on a 400 whatsapp_number_not_registered', async () => {
    paymentCheckout.mockRejectedValueOnce(
      axiosErrorWithReason('whatsapp_number_not_registered')
    );
    const repository = new ApiPaymentRepository(mockSessionRepository);

    const promise = repository.checkout({
      customerName: 'Andi',
      method: 'qris',
      whatsappNumber: '6281234567890',
    });

    await expect(promise).rejects.toThrow(WhatsappNumberRejectedError);
    await expect(promise).rejects.toMatchObject({ reason: 'not_registered' });
  });

  it('rethrows a 400 with an unrecognized reason as-is', async () => {
    const error = axiosErrorWithReason('something_else');
    paymentCheckout.mockRejectedValueOnce(error);
    const repository = new ApiPaymentRepository(mockSessionRepository);

    await expect(
      repository.checkout({ customerName: 'Andi', method: 'qris' })
    ).rejects.toBe(error);
  });

  it('rethrows a non-400 error as-is', async () => {
    const error = new Error('network error');
    paymentCheckout.mockRejectedValueOnce(error);
    const repository = new ApiPaymentRepository(mockSessionRepository);

    await expect(
      repository.checkout({ customerName: 'Andi', method: 'qris' })
    ).rejects.toBe(error);
  });
});

function axiosErrorWithReason(reason: string) {
  return Object.assign(new Error('Request failed with status code 400'), {
    isAxiosError: true,
    response: { status: 400, data: { reason } },
  });
}
