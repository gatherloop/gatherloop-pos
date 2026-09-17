import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  kdsDeviceDeleteById,
  kdsDeviceList,
  kdsDeviceListQueryKey,
  kdsDeviceRegister,
  kdsDeviceSendTestNotification,
} from '../../../../api-contract/src';
import { KdsDevice, KdsDeviceRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiKdsDeviceRequest, toKdsDevice } from './kdsDevice.transformer';

export class ApiKdsDeviceRepository implements KdsDeviceRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchKdsDeviceList = (
    options?: Partial<RequestConfig>
  ): Promise<KdsDevice[]> => {
    return this.client
      .fetchQuery({
        queryKey: kdsDeviceListQueryKey(),
        queryFn: () => kdsDeviceList(options),
      })
      .then((data) => data.data.map(toKdsDevice));
  };

  registerKdsDevice: KdsDeviceRepository['registerKdsDevice'] = (params) => {
    return kdsDeviceRegister(toApiKdsDeviceRequest(params)).then(({ data }) =>
      toKdsDevice(data)
    );
  };

  deleteKdsDeviceById: KdsDeviceRepository['deleteKdsDeviceById'] = (
    kdsDeviceId
  ) => {
    return kdsDeviceDeleteById(kdsDeviceId).then();
  };

  sendTestNotification: KdsDeviceRepository['sendTestNotification'] = (
    kdsDeviceId
  ) => {
    return kdsDeviceSendTestNotification(kdsDeviceId).then();
  };
}
