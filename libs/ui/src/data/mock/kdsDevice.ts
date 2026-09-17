import { KdsDevice } from '../../domain/entities';
import {
  KdsDeviceRegisterParams,
  KdsDeviceRepository,
} from '../../domain/repositories/kdsDevice';

const initialKdsDevices: KdsDevice[] = [
  {
    id: 1,
    name: "Andi's phone",
    pushToken: 'ExponentPushToken[mock-token-1]',
    platform: 'android',
    createdAt: '2024-03-20T00:00:00.000Z',
  },
];

export class MockKdsDeviceRepository implements KdsDeviceRepository {
  kdsDevices: KdsDevice[] = [...initialKdsDevices];
  private nextId = 2;
  private shouldFail = false;
  private shouldFailTestNotification = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  setShouldFailTestNotification(value: boolean) {
    this.shouldFailTestNotification = value;
  }

  async fetchKdsDeviceList(): Promise<KdsDevice[]> {
    if (this.shouldFail) throw new Error('Failed to fetch kds devices');
    return [...this.kdsDevices];
  }

  async registerKdsDevice(
    params: KdsDeviceRegisterParams
  ): Promise<KdsDevice> {
    if (this.shouldFail) throw new Error('Failed to register kds device');
    const existing = this.kdsDevices.find(
      (device) => device.pushToken === params.pushToken
    );
    if (existing) {
      existing.name = params.name;
      existing.platform = params.platform;
      existing.lastSeenAt = new Date().toISOString();
      return { ...existing };
    }
    const device: KdsDevice = {
      id: this.nextId++,
      name: params.name,
      pushToken: params.pushToken,
      platform: params.platform,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.kdsDevices.push(device);
    return { ...device };
  }

  async deleteKdsDeviceById(kdsDeviceId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete kds device');
    this.kdsDevices = this.kdsDevices.filter(
      (device) => device.id !== kdsDeviceId
    );
  }

  async sendTestNotification(kdsDeviceId: number): Promise<void> {
    if (this.shouldFailTestNotification) {
      throw new Error('Failed to send test notification');
    }
    const exists = this.kdsDevices.some(
      (device) => device.id === kdsDeviceId
    );
    if (!exists) throw new Error('Kds device not found');
  }

  reset() {
    this.kdsDevices = [...initialKdsDevices];
    this.nextId = 2;
    this.shouldFail = false;
    this.shouldFailTestNotification = false;
  }
}
