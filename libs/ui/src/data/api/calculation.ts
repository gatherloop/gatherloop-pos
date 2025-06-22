import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  calculationCreate,
  calculationDeleteById,
  calculationFindById,
  calculationFindByIdQueryKey,
  calculationList,
  calculationListQueryKey,
  calculationUpdateById,
  Calculation as ApiCalculation,
} from '../../../../api-contract/src';
import { Calculation, CalculationRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';

export class ApiCalculationRepository implements CalculationRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchCalculationById = (
    calculationId: number,
    options?: Partial<RequestConfig>
  ) => {
    return this.client
      .fetchQuery({
        queryKey: calculationFindByIdQueryKey(calculationId),
        queryFn: () => calculationFindById(calculationId, options),
      })
      .then(({ data }) => transformers.calculation(data));
  };

  createCalculation: CalculationRepository['createCalculation'] = (
    formValues
  ) => {
    return calculationCreate({
      calculationItems: formValues.calculationItems,
      walletId: formValues.walletId,
    }).then();
  };

  updateCalculation: CalculationRepository['updateCalculation'] = (
    formValues,
    calculationId
  ) => {
    return calculationUpdateById(calculationId, {
      calculationItems: formValues.calculationItems,
      walletId: formValues.walletId,
    }).then();
  };

  deleteCalculationById: CalculationRepository['deleteCalculationById'] = (
    calculationId
  ) => {
    return calculationDeleteById(calculationId).then();
  };

  fetchCalculationList = (options?: Partial<RequestConfig>) => {
    return this.client
      .fetchQuery({
        queryKey: calculationListQueryKey({
          sortBy: 'created_at',
          order: 'desc',
        }),
        queryFn: () =>
          calculationList({ sortBy: 'created_at', order: 'desc' }, options),
      })
      .then((data) => data.data.map(transformers.calculation));
  };
}

const transformers = {
  calculation: (calculation: ApiCalculation): Calculation => ({
    id: calculation.id,
    createdAt: calculation.createdAt,
    updatedAt: calculation.updatedAt,
    calculationItems: calculation.calculationItems.map((item) => ({
      id: item.id,
      amount: item.amount,
      price: item.price,
    })),
    totalCalculation: calculation.totalCalculation,
    totalWallet: calculation.totalWallet,
    wallet: {
      balance: calculation.wallet.balance,
      createdAt: calculation.createdAt,
      id: calculation.wallet.id,
      name: calculation.wallet.name,
      paymentCostPercentage: calculation.wallet.paymentCostPercentage,
    },
  }),
};
