import { WebPushConfig, WebPushSubscription } from '../entities';

export interface WebPushSubscriptionRepository {
  fetchConfig: () => Promise<WebPushConfig>;

  subscribe: (subscription: WebPushSubscription) => Promise<void>;

  unsubscribe: (endpoint: string) => Promise<void>;
}
