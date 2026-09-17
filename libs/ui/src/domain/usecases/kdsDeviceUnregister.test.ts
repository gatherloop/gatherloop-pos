import {
  KdsDeviceUnregisterUsecase,
  KdsDeviceUnregisterState,
  KdsDeviceUnregisterAction,
  KdsDeviceUnregisterParams,
} from './kdsDeviceUnregister';
import { MockKdsDeviceRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('KdsDeviceUnregisterUsecase', () => {
  describe('success flow', () => {
    it('should transition idle → unregistering → unregistered', async () => {
      const repository = new MockKdsDeviceRepository();
      const kdsDeviceId = repository.kdsDevices[0].id;
      const usecase = new KdsDeviceUnregisterUsecase(repository, {
        kdsDeviceId,
      });
      const tester = new UsecaseTester<
        KdsDeviceUnregisterUsecase,
        KdsDeviceUnregisterState,
        KdsDeviceUnregisterAction,
        KdsDeviceUnregisterParams
      >(usecase);

      expect(tester.state.type).toBe('idle');

      tester.dispatch({ type: 'UNREGISTER' });
      expect(tester.state.type).toBe('unregistering');

      await flushPromises();
      expect(tester.state.type).toBe('unregistered');
      expect(
        repository.kdsDevices.some((device) => device.id === kdsDeviceId)
      ).toBe(false);
    });
  });

  describe('error flow', () => {
    it('should transition idle → unregistering → error', async () => {
      const repository = new MockKdsDeviceRepository();
      repository.setShouldFail(true);
      const usecase = new KdsDeviceUnregisterUsecase(repository, {
        kdsDeviceId: repository.kdsDevices[0].id,
      });
      const tester = new UsecaseTester<
        KdsDeviceUnregisterUsecase,
        KdsDeviceUnregisterState,
        KdsDeviceUnregisterAction,
        KdsDeviceUnregisterParams
      >(usecase);

      tester.dispatch({ type: 'UNREGISTER' });
      expect(tester.state.type).toBe('unregistering');

      await flushPromises();
      expect(tester.state.type).toBe('error');
      expect(tester.state.errorMessage).toBe('Failed to unregister device');
    });
  });
});
