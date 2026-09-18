import { WebPushConfig, WebPushSubscription } from '../../domain/entities';
import { WebPushSubscriptionRepository } from '../../domain/repositories/webPushSubscription';

export class MockWebPushSubscriptionRepository
  implements WebPushSubscriptionRepository
{
  config: WebPushConfig = { vapidPublicKey: 'mock-vapid-public-key' };
  subscriptions: WebPushSubscription[] = [];

  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchConfig(): Promise<WebPushConfig> {
    if (this.shouldFail) throw new Error('Failed to fetch web push config');
    return this.config;
  }

  async subscribe(subscription: WebPushSubscription): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to subscribe');
    this.subscriptions = [
      ...this.subscriptions.filter((s) => s.endpoint !== subscription.endpoint),
      subscription,
    ];
  }

  async unsubscribe(endpoint: string): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to unsubscribe');
    this.subscriptions = this.subscriptions.filter(
      (s) => s.endpoint !== endpoint
    );
  }

  reset() {
    this.shouldFail = false;
    this.subscriptions = [];
  }
}
