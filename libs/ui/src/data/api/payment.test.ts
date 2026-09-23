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
  },
});

// eslint-disable-next-line @nx/enforce-module-boundaries
jest.mock('../../../../api-contract/src', () => ({
  paymentFindByPartnerReferenceNo: (...args: unknown[]) =>
    paymentFindByPartnerReferenceNo(...args),
  paymentCheckout: (...args: unknown[]) => paymentCheckout(...args),
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
});
