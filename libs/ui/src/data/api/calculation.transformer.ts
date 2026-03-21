// eslint-disable-next-line @nx/enforce-module-boundaries
import { Calculation as ApiCalculation } from '../../../../api-contract/src';
import { Calculation, CalculationForm } from '../../domain';
import { toWallet } from './wallet.transformer';

export function toCalculation(calculation: ApiCalculation): Calculation {
  return {
    id: calculation.id,
    createdAt: calculation.createdAt,
    updatedAt: calculation.updatedAt,
    completedAt: calculation.completedAt ?? null,
    calculationItems: calculation.calculationItems.map((item) => ({
      id: item.id,
      amount: item.amount,
      price: item.price,
    })),
    totalCalculation: calculation.totalCalculation,
    totalWallet: calculation.totalWallet,
    wallet: toWallet(calculation.wallet),
  };
}

export function toApiCalculation(form: CalculationForm) {
  return {
    calculationItems: form.calculationItems,
    walletId: form.walletId,
  };
}
