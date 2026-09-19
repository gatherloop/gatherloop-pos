import fs from 'fs';
import path from 'path';
import {
  MockWebPushRepository,
  MockWebPushSubscriptionRepository,
} from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';
import {
  OrderNotificationSubscribeAction,
  OrderNotificationSubscribeState,
  OrderNotificationSubscribeUsecase,
} from './orderNotificationSubscribe';

describe('OrderNotificationSubscribeUsecase', () => {
  it('never references a global navigator', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'orderNotificationSubscribe.ts'),
      'utf-8'
    );
    expect(source).not.toMatch(/\bnavigator\b/);
  });

  describe('unsupported browser', () => {
    it('should start as unsupported', () => {
      const webPushRepository = new MockWebPushRepository();
      webPushRepository.setSupportStatus('unsupported');
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('unsupported');
    });
  });

  describe('iOS not installed to Home Screen', () => {
    it('should start as needsInstall', () => {
      const webPushRepository = new MockWebPushRepository();
      webPushRepository.setSupportStatus('needsInstall');
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('needsInstall');
    });
  });

  describe('checking for an existing subscription', () => {
    it('should start as checkingSubscription then settle on idle when none exists', async () => {
      const webPushRepository = new MockWebPushRepository();
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('checkingSubscription');

      await flushPromises();
      expect(tester.state.type).toBe('idle');
    });

    it('should settle on subscribed when the browser already has a subscription', async () => {
      const webPushRepository = new MockWebPushRepository();
      webPushRepository.setSubscription({
        endpoint: 'https://fcm.googleapis.com/fcm/send/existing-endpoint',
        p256dhKey: 'existing-p256dh-key',
        authKey: 'existing-auth-key',
        userAgent: 'existing-user-agent',
      });
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      await flushPromises();
      expect(tester.state.type).toBe('subscribed');
    });

    it('should settle on idle when checking the existing subscription fails', async () => {
      const webPushRepository = new MockWebPushRepository();
      webPushRepository.setShouldFail(true);
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      await flushPromises();
      expect(tester.state.type).toBe('idle');
    });
  });

  describe('permission granted flow', () => {
    it('should transition idle → checkingPermission → subscribing → subscribed', async () => {
      const webPushRepository = new MockWebPushRepository();
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('checkingSubscription');
      await flushPromises();
      expect(tester.state.type).toBe('idle');

      tester.dispatch({ type: 'SUBSCRIBE' });
      expect(tester.state.type).toBe('checkingPermission');

      await flushPromises();
      expect(tester.state.type).toBe('subscribed');
      expect(webPushSubscriptionRepository.subscriptions).toHaveLength(1);
      expect(webPushSubscriptionRepository.subscriptions[0].endpoint).toBe(
        'https://fcm.googleapis.com/fcm/send/mock-endpoint'
      );
    });
  });

  describe('permission denied flow', () => {
    it('should transition idle → checkingPermission → permissionDenied', async () => {
      const webPushRepository = new MockWebPushRepository();
      webPushRepository.setPermissionStatus('denied');
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      await flushPromises();
      tester.dispatch({ type: 'SUBSCRIBE' });
      expect(tester.state.type).toBe('checkingPermission');

      await flushPromises();
      expect(tester.state.type).toBe('permissionDenied');
    });

    it('should allow a retry after a denial', async () => {
      const webPushRepository = new MockWebPushRepository();
      webPushRepository.setPermissionStatus('denied');
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      await flushPromises();
      tester.dispatch({ type: 'SUBSCRIBE' });
      await flushPromises();
      expect(tester.state.type).toBe('permissionDenied');

      webPushRepository.setPermissionStatus('undetermined');
      tester.dispatch({ type: 'SUBSCRIBE' });
      expect(tester.state.type).toBe('checkingPermission');

      await flushPromises();
      expect(tester.state.type).toBe('subscribed');
    });
  });

  describe('subscribe error flow', () => {
    it('should transition subscribing → subscribeError and allow a retry', async () => {
      const webPushRepository = new MockWebPushRepository();
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      webPushSubscriptionRepository.setShouldFail(true);
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      await flushPromises();
      tester.dispatch({ type: 'SUBSCRIBE' });
      await flushPromises();
      expect(tester.state.type).toBe('subscribeError');
      expect(tester.state.errorMessage).toBe('Failed to enable notifications');

      webPushSubscriptionRepository.setShouldFail(false);
      tester.dispatch({ type: 'RETRY' });
      expect(tester.state.type).toBe('subscribing');

      await flushPromises();
      expect(tester.state.type).toBe('subscribed');
    });
  });

  describe('unsubscribe flow', () => {
    it('should transition subscribed → unsubscribing → idle', async () => {
      const webPushRepository = new MockWebPushRepository();
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      await flushPromises();
      tester.dispatch({ type: 'SUBSCRIBE' });
      await flushPromises();
      expect(tester.state.type).toBe('subscribed');

      tester.dispatch({ type: 'UNSUBSCRIBE' });
      expect(tester.state.type).toBe('unsubscribing');

      await flushPromises();
      expect(tester.state.type).toBe('idle');
      expect(webPushSubscriptionRepository.subscriptions).toHaveLength(0);
    });

    it('should return to subscribed when unsubscribing fails', async () => {
      const webPushRepository = new MockWebPushRepository();
      const webPushSubscriptionRepository = new MockWebPushSubscriptionRepository();
      const usecase = new OrderNotificationSubscribeUsecase(
        webPushRepository,
        webPushSubscriptionRepository
      );
      const tester = new UsecaseTester<
        OrderNotificationSubscribeUsecase,
        OrderNotificationSubscribeState,
        OrderNotificationSubscribeAction,
        undefined
      >(usecase);

      await flushPromises();
      tester.dispatch({ type: 'SUBSCRIBE' });
      await flushPromises();
      expect(tester.state.type).toBe('subscribed');

      webPushSubscriptionRepository.setShouldFail(true);
      tester.dispatch({ type: 'UNSUBSCRIBE' });
      await flushPromises();
      expect(tester.state.type).toBe('subscribed');
      expect(tester.state.errorMessage).toBe(
        'Failed to turn off notifications'
      );
    });
  });
});
