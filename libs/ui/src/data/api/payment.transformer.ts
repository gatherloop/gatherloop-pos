// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Payment as ApiPayment,
  PaymentItem as ApiPaymentItem,
  PaymentSummary as ApiPaymentSummary,
} from '../../../../api-contract/src';
import {
  Payment,
  PaymentItem,
  PaymentSummary,
} from '../../domain/entities/Payment';

export function toPaymentItem(item: ApiPaymentItem): PaymentItem {
  return {
    name: item.name,
    amount: item.amount,
    price: item.price,
    subtotal: item.subtotal,
    note: item.note,
    options: item.options,
  };
}

export function toPayment(payment: ApiPayment): Payment {
  return {
    reference: payment.partnerReferenceNo,
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    qrContent: payment.qrContent,
    expiredAt: payment.expiredAt,
    paidAt: payment.paidAt ?? null,
    customerName: payment.customerName,
    tableLabel: payment.tableLabel,
    items: payment.items.map(toPaymentItem),
    transactionNumber: payment.transactionNumber,
    fulfillmentStatus: payment.fulfillmentStatus,
  };
}

export function toPaymentSummary(payment: ApiPaymentSummary): PaymentSummary {
  return {
    reference: payment.partnerReferenceNo,
    status: payment.status,
    method: payment.method,
    fulfillmentStatus: payment.fulfillmentStatus,
    transactionNumber: payment.transactionNumber,
    customerName: payment.customerName,
    tableLabel: payment.tableLabel,
    amount: payment.amount,
    itemCount: payment.itemCount,
    createdAt: payment.createdAt,
    paidAt: payment.paidAt ?? null,
  };
}
