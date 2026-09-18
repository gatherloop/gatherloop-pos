import { WebPushSubscription } from '../entities';
import { PermissionStatus } from './pushToken';

export type WebPushSupportStatus = 'supported' | 'unsupported' | 'needsInstall';

export interface WebPushRepository {
  getSupportStatus: () => WebPushSupportStatus;

  getPermissionStatus: () => Promise<PermissionStatus>;

  requestPermission: () => Promise<PermissionStatus>;

  subscribe: (vapidPublicKey: string) => Promise<WebPushSubscription>;

  getSubscription: () => Promise<WebPushSubscription | null>;

  unsubscribe: () => Promise<void>;
}
