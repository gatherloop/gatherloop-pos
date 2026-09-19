import { WebPushSubscription } from '../../domain/entities';
import { PermissionStatus } from '../../domain/repositories/pushToken';
import {
  WebPushRepository,
  WebPushSupportStatus,
} from '../../domain/repositories/webPush';

export class MockWebPushRepository implements WebPushRepository {
  private supportStatus: WebPushSupportStatus = 'supported';
  private permissionStatus: PermissionStatus = 'undetermined';
  private shouldFail = false;
  private subscription: WebPushSubscription | null = null;

  setSupportStatus(value: WebPushSupportStatus) {
    this.supportStatus = value;
  }

  setPermissionStatus(value: PermissionStatus) {
    this.permissionStatus = value;
  }

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  setSubscription(value: WebPushSubscription | null) {
    this.subscription = value;
  }

  getSupportStatus(): WebPushSupportStatus {
    return this.supportStatus;
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    if (this.shouldFail) throw new Error('Failed to get permission status');
    return this.permissionStatus;
  }

  async requestPermission(): Promise<PermissionStatus> {
    if (this.shouldFail) throw new Error('Failed to request permission');
    if (this.permissionStatus === 'undetermined') {
      this.permissionStatus = 'granted';
    }
    return this.permissionStatus;
  }

  async subscribe(): Promise<WebPushSubscription> {
    if (this.shouldFail) throw new Error('Failed to subscribe');
    this.subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/mock-endpoint',
      p256dhKey: 'mock-p256dh-key',
      authKey: 'mock-auth-key',
      userAgent: 'mock-user-agent',
    };
    return this.subscription;
  }

  async getSubscription(): Promise<WebPushSubscription | null> {
    if (this.shouldFail) throw new Error('Failed to get subscription');
    return this.subscription;
  }

  async unsubscribe(): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to unsubscribe');
    this.subscription = null;
  }

  reset() {
    this.supportStatus = 'supported';
    this.permissionStatus = 'undetermined';
    this.shouldFail = false;
    this.subscription = null;
  }
}
