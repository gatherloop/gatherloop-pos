import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  availabilityList,
  availabilityListQueryKey,
  availabilityUpdate,
} from '../../../../api-contract/src';
import { AvailabilityProduct, AvailabilityRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import {
  toApiAvailabilityUpdateRequest,
  toAvailabilityProduct,
} from './availability.transformer';

export class ApiAvailabilityRepository implements AvailabilityRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchAvailabilityList = (
    options?: Partial<RequestConfig>
  ): Promise<AvailabilityProduct[]> => {
    return this.client
      .fetchQuery({
        queryKey: availabilityListQueryKey(),
        queryFn: () => availabilityList(options),
      })
      .then((data) => data.data.map(toAvailabilityProduct));
  };

  updateAvailability: AvailabilityRepository['updateAvailability'] = (form) => {
    return availabilityUpdate(toApiAvailabilityUpdateRequest(form)).then(
      (data) => data.data.map(toAvailabilityProduct)
    );
  };
}
