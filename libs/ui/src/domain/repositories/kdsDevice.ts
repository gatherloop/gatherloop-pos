import { KdsDevice, KdsDeviceForm, KdsPlatform } from '../entities';

export type KdsDeviceRegisterParams = KdsDeviceForm & {
  pushToken: string;
  platform: KdsPlatform;
};

export interface KdsDeviceRepository {
  fetchKdsDeviceList: () => Promise<KdsDevice[]>;

  registerKdsDevice: (params: KdsDeviceRegisterParams) => Promise<KdsDevice>;

  deleteKdsDeviceById: (kdsDeviceId: number) => Promise<void>;

  sendTestNotification: (kdsDeviceId: number) => Promise<void>;
}
