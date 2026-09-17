export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PushTokenRepository {
  getPermissionStatus: () => Promise<PermissionStatus>;

  requestPermission: () => Promise<PermissionStatus>;

  getPushToken: () => Promise<string>;
}
