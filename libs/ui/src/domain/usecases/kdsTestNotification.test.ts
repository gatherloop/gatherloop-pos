import {
  KdsTestNotificationUsecase,
  KdsTestNotificationState,
  KdsTestNotificationAction,
  KdsTestNotificationParams,
} from './kdsTestNotification';
import { MockKdsDeviceRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('KdsTestNotificationUsecase', () => {
  describe('success flow', () => {
    it('should transition idle → sending → sent', async () => {
      const repository = new MockKdsDeviceRepository();
      const usecase = new KdsTestNotificationUsecase(repository, {
        kdsDeviceId: repository.kdsDevices[0].id,
      });
      const tester = new UsecaseTester<
        KdsTestNotificationUsecase,
        KdsTestNotificationState,
        KdsTestNotificationAction,
        KdsTestNotificationParams
      >(usecase);

      expect(tester.state.type).toBe('idle');

      tester.dispatch({ type: 'SEND' });
      expect(tester.state.type).toBe('sending');

      await flushPromises();
      expect(tester.state.type).toBe('sent');
    });
  });

  describe('error flow', () => {
    it('should transition idle → sending → error and allow a retry', async () => {
      const repository = new MockKdsDeviceRepository();
      repository.setShouldFailTestNotification(true);
      const usecase = new KdsTestNotificationUsecase(repository, {
        kdsDeviceId: repository.kdsDevices[0].id,
      });
      const tester = new UsecaseTester<
        KdsTestNotificationUsecase,
        KdsTestNotificationState,
        KdsTestNotificationAction,
        KdsTestNotificationParams
      >(usecase);

      tester.dispatch({ type: 'SEND' });
      expect(tester.state.type).toBe('sending');

      await flushPromises();
      expect(tester.state.type).toBe('error');
      expect(tester.state.errorMessage).toBe(
        'Failed to send test notification'
      );

      repository.setShouldFailTestNotification(false);
      tester.dispatch({ type: 'SEND' });
      expect(tester.state.type).toBe('sending');

      await flushPromises();
      expect(tester.state.type).toBe('sent');
    });
  });
});
