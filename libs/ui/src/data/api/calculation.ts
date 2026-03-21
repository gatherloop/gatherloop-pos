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
  calculationCompleteById,
} from '../../../../api-contract/src';
import { Calculation, CalculationRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiCalculation, toCalculation } from './calculation.transformer';

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
      .then(({ data }) => toCalculation(data));
  };

  createCalculation: CalculationRepository['createCalculation'] = (
    formValues
  ) => {
    return calculationCreate(toApiCalculation(formValues)).then();
  };

  updateCalculation: CalculationRepository['updateCalculation'] = (
    formValues,
    calculationId
  ) => {
    return calculationUpdateById(calculationId, toApiCalculation(formValues)).then();
  };

  deleteCalculationById: CalculationRepository['deleteCalculationById'] = (
    calculationId
  ) => {
    return calculationDeleteById(calculationId).then();
  };

  completeCalculationById: CalculationRepository['completeCalculationById'] = (
    calculationId
  ) => {
    return calculationCompleteById(calculationId).then();
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
      .then((data) => data.data.map(toCalculation));
  };
}
