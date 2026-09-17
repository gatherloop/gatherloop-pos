import {
  PermissionStatus,
  PushTokenRepository,
} from '../../domain/repositories/pushToken';

export class MockPushTokenRepository implements PushTokenRepository {
  private permissionStatus: PermissionStatus = 'undetermined';
  private shouldFail = false;
  private pushToken = 'ExponentPushToken[mock-push-token]';

  setPermissionStatus(value: PermissionStatus) {
    this.permissionStatus = value;
  }

  setShouldFail(value: boolean) {
    this.shouldFail = value;
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

  async getPushToken(): Promise<string> {
    if (this.shouldFail) throw new Error('Failed to get push token');
    return this.pushToken;
  }

  reset() {
    this.permissionStatus = 'undetermined';
    this.shouldFail = false;
  }
}
