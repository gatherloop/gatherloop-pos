// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  Transaction as ApiTransaction,
  TransactionStatistic as ApiTransactionStatistic,
} from '../../../../api-contract/src';
import { Transaction, TransactionForm, TransactionStatistic } from '../../domain';
import { toWallet } from './wallet.transformer';

export function toTransactionStatistic(
  transactionStatistic: ApiTransactionStatistic
): TransactionStatistic {
  return {
    date: transactionStatistic.date,
    total: transactionStatistic.total,
    totalIncome: transactionStatistic.totalIncome,
  };
}

export function toTransaction(transaction: ApiTransaction): Transaction {
  return {
    id: transaction.id,
    createdAt: transaction.createdAt,
    name: transaction.name,
    orderNumber: transaction.orderNumber,
    total: transaction.total,
    totalIncome: transaction.totalIncome,
    transactionItems: transaction.transactionItems.map((item) => ({
      amount: item.amount,
      id: item.id,
      price: item.price,
      discountAmount: item.discountAmount,
      subtotal: item.subtotal,
      note: item.note,
      variant: {
        createdAt: item.variant.createdAt,
        id: item.variant.id,
        name: item.variant.name,
        price: item.variant.price,
        materials: (item.variant.materials ?? []).map((variantMaterial) => ({
          id: variantMaterial.id,
          materialId: variantMaterial.materialId,
          amount: variantMaterial.amount,
          material: {
            id: variantMaterial.material.id,
            name: variantMaterial.material.name,
            price: variantMaterial.material.price,
            unit: variantMaterial.material.unit,
            createdAt: variantMaterial.material.createdAt,
            weeklyUsage: variantMaterial.material.weeklyUsage,
          },
        })),
        description: item.variant.description ?? '',
        product: {
          category: item.variant.product.category,
          createdAt: item.variant.product.createdAt,
          id: item.variant.product.id,
          name: item.variant.product.name,
          description: item.variant.product.description ?? '',
          options: item.variant.product.options,
          imageUrl: item.variant.product.imageUrl,
          saleType: item.variant.product.saleType,
        },
        values: item.variant.values.map((value) => ({
          id: value.id,
          variantId: value.variantId,
          optionValueId: value.optionValueId,
          optionValue: {
            id: value.optionValue.id,
            name: value.optionValue.name,
          },
        })),
      },
    })),
    transactionCoupons: transaction.transactionCoupons.map((item) => ({
      id: item.id,
      type: item.type,
      amount: item.amount,
      coupon: {
        id: item.coupon.id,
        amount: item.coupon.amount,
        code: item.coupon.code,
        type: item.coupon.type,
        createdAt: item.coupon.createdAt,
      },
    })),
    paidAt: transaction.paidAt ?? null,
    wallet: transaction.wallet ? toWallet(transaction.wallet) : null,
    paidAmount: transaction.paidAmount,
  };
}

export function toApiTransaction(form: TransactionForm) {
  return {
    name: form.name,
    orderNumber: form.orderNumber,
    transactionItems: form.transactionItems.map((item) => ({
      id: item.id,
      amount: item.amount,
      variantId: item.variant.id,
      discountAmount: item.discountAmount,
      note: item.note,
    })),
    transactionCoupons: form.transactionCoupons.map((item) => ({
      id: item.id,
      couponId: item.coupon.id,
    })),
  };
}
