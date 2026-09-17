import {
  KdsDeviceRegisterUsecase,
  KdsDeviceRegisterState,
  KdsDeviceRegisterAction,
} from './kdsDeviceRegister';
import { MockKdsDeviceRepository, MockPushTokenRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('KdsDeviceRegisterUsecase', () => {
  describe('permission granted flow', () => {
    it('should transition idle → checkingPermission → permissionGranted → registering → registered', async () => {
      const kdsDeviceRepository = new MockKdsDeviceRepository();
      const pushTokenRepository = new MockPushTokenRepository();
      const usecase = new KdsDeviceRegisterUsecase(
        kdsDeviceRepository,
        pushTokenRepository,
        'android'
      );
      const tester = new UsecaseTester<
        KdsDeviceRegisterUsecase,
        KdsDeviceRegisterState,
        KdsDeviceRegisterAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('idle');

      tester.dispatch({
        type: 'REQUEST_PERMISSION',
        name: "Andi's phone",
      });
      expect(tester.state.type).toBe('checkingPermission');

      await flushPromises();
      expect(tester.state.type).toBe('registered');
      expect(tester.state.device?.name).toBe("Andi's phone");
      expect(tester.state.device?.platform).toBe('android');
    });
  });

  describe('permission denied flow', () => {
    it('should transition idle → checkingPermission → permissionDenied', async () => {
      const kdsDeviceRepository = new MockKdsDeviceRepository();
      const pushTokenRepository = new MockPushTokenRepository();
      pushTokenRepository.setPermissionStatus('denied');
      const usecase = new KdsDeviceRegisterUsecase(
        kdsDeviceRepository,
        pushTokenRepository,
        'ios'
      );
      const tester = new UsecaseTester<
        KdsDeviceRegisterUsecase,
        KdsDeviceRegisterState,
        KdsDeviceRegisterAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'REQUEST_PERMISSION', name: 'Counter phone' });
      expect(tester.state.type).toBe('checkingPermission');

      await flushPromises();
      expect(tester.state.type).toBe('permissionDenied');
    });

    it('should retry checkingPermission after a denial', async () => {
      const kdsDeviceRepository = new MockKdsDeviceRepository();
      const pushTokenRepository = new MockPushTokenRepository();
      pushTokenRepository.setPermissionStatus('denied');
      const usecase = new KdsDeviceRegisterUsecase(
        kdsDeviceRepository,
        pushTokenRepository,
        'ios'
      );
      const tester = new UsecaseTester<
        KdsDeviceRegisterUsecase,
        KdsDeviceRegisterState,
        KdsDeviceRegisterAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'REQUEST_PERMISSION', name: 'Counter phone' });
      await flushPromises();
      expect(tester.state.type).toBe('permissionDenied');

      pushTokenRepository.setPermissionStatus('granted');
      tester.dispatch({ type: 'REQUEST_PERMISSION', name: 'Counter phone' });
      expect(tester.state.type).toBe('checkingPermission');

      await flushPromises();
      expect(tester.state.type).toBe('registered');
    });
  });

  describe('register error flow', () => {
    it('should transition registering → registerError and allow a retry', async () => {
      const kdsDeviceRepository = new MockKdsDeviceRepository();
      kdsDeviceRepository.setShouldFail(true);
      const pushTokenRepository = new MockPushTokenRepository();
      const usecase = new KdsDeviceRegisterUsecase(
        kdsDeviceRepository,
        pushTokenRepository,
        'android'
      );
      const tester = new UsecaseTester<
        KdsDeviceRegisterUsecase,
        KdsDeviceRegisterState,
        KdsDeviceRegisterAction,
        undefined
      >(usecase);

      tester.dispatch({ type: 'REQUEST_PERMISSION', name: "Andi's phone" });
      await flushPromises();
      expect(tester.state.type).toBe('registerError');
      expect(tester.state.errorMessage).toBe('Failed to register device');

      kdsDeviceRepository.setShouldFail(false);
      tester.dispatch({ type: 'RETRY' });
      expect(tester.state.type).toBe('registering');

      await flushPromises();
      expect(tester.state.type).toBe('registered');
    });
  });
});
