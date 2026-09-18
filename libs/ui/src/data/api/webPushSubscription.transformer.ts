// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  WebPushConfig as ApiWebPushConfig,
  WebPushSubscriptionRequest as ApiWebPushSubscriptionRequest,
} from '../../../../api-contract/src';
import {
  WebPushConfig,
  WebPushSubscription,
} from '../../domain/entities/WebPushSubscription';

export function toWebPushConfig(config: ApiWebPushConfig): WebPushConfig {
  return { vapidPublicKey: config.vapidPublicKey };
}

export function toWebPushSubscriptionRequest(
  subscription: WebPushSubscription
): ApiWebPushSubscriptionRequest {
  return {
    endpoint: subscription.endpoint,
    p256dhKey: subscription.p256dhKey,
    authKey: subscription.authKey,
    userAgent: subscription.userAgent,
  };
}
