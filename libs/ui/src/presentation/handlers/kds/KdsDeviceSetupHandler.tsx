import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'solito/router';
import { useToastController } from '@tamagui/toast';
import {
  AuthLogoutUsecase,
  KdsDeviceRegisterUsecase,
  KdsDeviceRepository,
  KdsDeviceUnregisterUsecase,
  KdsTestNotificationUsecase,
} from '../../../domain';
import { useUsecase } from '../hooks';
import { KdsDeviceSetupScreen } from '../../views/screens/kds/KdsDeviceSetupScreen';

export type KdsDeviceSetupHandlerProps = {
  kdsDeviceRegisterUsecase: KdsDeviceRegisterUsecase;
  kdsDeviceRepository: KdsDeviceRepository;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const KdsDeviceSetupHandler = (props: KdsDeviceSetupHandlerProps) => {
  const register = useUsecase(props.kdsDeviceRegisterUsecase);
  const router = useRouter();
  const toast = useToastController();

  const registeredDeviceId =
    register.state.type === 'registered' && register.state.device
      ? register.state.device.id
      : null;

  const [deviceSessionId, setDeviceSessionId] = useState<number | null>(null);
  const [testNotificationUsecase, setTestNotificationUsecase] = useState(
    () =>
      new KdsTestNotificationUsecase(props.kdsDeviceRepository, {
        kdsDeviceId: 0,
      })
  );
  const [unregisterUsecase, setUnregisterUsecase] = useState(
    () =>
      new KdsDeviceUnregisterUsecase(props.kdsDeviceRepository, {
        kdsDeviceId: 0,
      })
  );

  if (registeredDeviceId !== null && registeredDeviceId !== deviceSessionId) {
    setDeviceSessionId(registeredDeviceId);
    setTestNotificationUsecase(
      new KdsTestNotificationUsecase(props.kdsDeviceRepository, {
        kdsDeviceId: registeredDeviceId,
      })
    );
    setUnregisterUsecase(
      new KdsDeviceUnregisterUsecase(props.kdsDeviceRepository, {
        kdsDeviceId: registeredDeviceId,
      })
    );
  }

  const testNotification = useUsecase(testNotificationUsecase);
  const unregister = useUsecase(unregisterUsecase);
  const logout = useUsecase(props.authLogoutUsecase);

  useEffect(() => {
    if (unregister.state.type === 'unregistered') {
      toast.show('Device unregistered');
      logout.dispatch({ type: 'LOGOUT' });
    }
  }, [unregister.state.type, toast, logout.dispatch]);

  useEffect(() => {
    if (logout.state.type === 'loaded') {
      router.push('/login');
    }
  }, [logout.state.type, router]);

  return (
    <KdsDeviceSetupScreen
      defaultValues={{ name: register.state.name }}
      formVariant={{ type: 'loaded' }}
      isRegisterDisabled={
        register.state.type === 'checkingPermission' ||
        register.state.type === 'registering' ||
        register.state.type === 'registered'
      }
      isRegistering={
        register.state.type === 'checkingPermission' ||
        register.state.type === 'registering'
      }
      isPermissionDenied={register.state.type === 'permissionDenied'}
      registerError={
        register.state.type === 'registerError'
          ? register.state.errorMessage ?? 'Failed to register device'
          : undefined
      }
      onSubmit={(values) => {
        if (register.state.type === 'registerError') {
          register.dispatch({ type: 'RETRY' });
        } else {
          register.dispatch({ type: 'REQUEST_PERMISSION', name: values.name });
        }
      }}
      onOpenSettings={() => {
        Linking.openSettings();
      }}
      registeredDevice={
        register.state.type === 'registered'
          ? register.state.device ?? undefined
          : undefined
      }
      isSendingTestNotification={testNotification.state.type === 'sending'}
      isTestNotificationSent={testNotification.state.type === 'sent'}
      testNotificationError={
        testNotification.state.type === 'error'
          ? testNotification.state.errorMessage ?? 'Failed to send test notification'
          : undefined
      }
      onSendTestNotification={() =>
        testNotification.dispatch({ type: 'SEND' })
      }
      onUnregister={() => unregister.dispatch({ type: 'UNREGISTER' })}
      onLogout={() => logout.dispatch({ type: 'LOGOUT' })}
    />
  );
};
