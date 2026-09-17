// eslint-disable-next-line @nx/enforce-module-boundaries
import { KdsDevice as ApiKdsDevice } from '../../../../api-contract/src';
import { KdsDevice, KdsDeviceRegisterParams } from '../../domain';

export function toKdsDevice(kdsDevice: ApiKdsDevice): KdsDevice {
  return {
    id: kdsDevice.id,
    name: kdsDevice.name,
    pushToken: kdsDevice.pushToken,
    platform: kdsDevice.platform,
    lastSeenAt: kdsDevice.lastSeenAt,
    createdAt: kdsDevice.createdAt,
    deletedAt: kdsDevice.deletedAt,
  };
}

export function toApiKdsDeviceRequest(params: KdsDeviceRegisterParams) {
  return {
    name: params.name,
    pushToken: params.pushToken,
    platform: params.platform,
  };
}
