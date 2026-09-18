// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  webPushConfigFind,
  webPushSubscriptionCreate,
  webPushSubscriptionDelete,
} from '../../../../api-contract/src';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { RequestConfig } from '../../../../api-contract/src/client';
import { SessionRepository } from '../../domain/repositories/session';
import { WebPushSubscriptionRepository } from '../../domain/repositories/webPushSubscription';
import {
  toWebPushConfig,
  toWebPushSubscriptionRequest,
} from './webPushSubscription.transformer';

export class ApiWebPushSubscriptionRepository
  implements WebPushSubscriptionRepository
{
  constructor(private readonly sessionRepository: SessionRepository) {}

  private sessionRequestConfig(): Partial<RequestConfig> {
    return {
      headers: { 'X-Session-Id': this.sessionRepository.getSessionId() },
      withCredentials: false,
    };
  }

  fetchConfig: WebPushSubscriptionRepository['fetchConfig'] = () => {
    return webPushConfigFind().then(({ data }) => toWebPushConfig(data));
  };

  subscribe: WebPushSubscriptionRepository['subscribe'] = (subscription) => {
    return webPushSubscriptionCreate(
      toWebPushSubscriptionRequest(subscription),
      this.sessionRequestConfig()
    ).then(() => undefined);
  };

  unsubscribe: WebPushSubscriptionRepository['unsubscribe'] = (endpoint) => {
    return webPushSubscriptionDelete(
      { endpoint },
      this.sessionRequestConfig()
    ).then(() => undefined);
  };
}
