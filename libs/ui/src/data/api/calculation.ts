import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  calculationCreate,
  calculationDeleteById,
  calculationFindById,
  CalculationFindById200,
  calculationFindByIdQueryKey,
  calculationList,
  CalculationList200,
  calculationListQueryKey,
  calculationUpdateById,
  Calculation as ApiCalculation,
} from '../../../../api-contract/src';
import { Calculation, CalculationRepository } from '../../domain';

export class ApiCalculationRepository implements CalculationRepository {
  client: QueryClient;

  calculationByIdServerParams: number | null = null;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getCalculationById: CalculationRepository['getCalculationById'] = (
    calculationId
  ) => {
    const res = this.client.getQueryState<CalculationFindById200>(
      calculationFindByIdQueryKey(calculationId)
    )?.data;

    this.client.removeQueries({
      queryKey: calculationFindByIdQueryKey(calculationId),
    });

    return res ? transformers.calculation(res.data) : null;
  };

  getCalculationByIdServerParams: CalculationRepository['getCalculationByIdServerParams'] =
    () => this.calculationByIdServerParams;

  fetchCalculationById: CalculationRepository['fetchCalculationById'] = (
    calculationId
  ) => {
    return this.client
      .fetchQuery({
        queryKey: calculationFindByIdQueryKey(calculationId),
        queryFn: () => calculationFindById(calculationId),
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

  getCalculationList: CalculationRepository['getCalculationList'] = () => {
    const res = this.client.getQueryState<CalculationList200>(
      calculationListQueryKey({ sortBy: 'created_at', order: 'desc' })
    )?.data;

    this.client.removeQueries({
      queryKey: calculationListQueryKey({
        sortBy: 'created_at',
        order: 'desc',
      }),
    });

    return res?.data.map(transformers.calculation) ?? [];
  };

  fetchCalculationList: CalculationRepository['fetchCalculationList'] = () => {
    return this.client
      .fetchQuery({
        queryKey: calculationListQueryKey({
          sortBy: 'created_at',
          order: 'desc',
        }),
        queryFn: () => calculationList({ sortBy: 'created_at', order: 'desc' }),
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
