import { Platform } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { ApiAuthRepository } from '../../data/api/auth';
import { ApiKdsDeviceRepository } from '../../data/api/kdsDevice';
import { KdsPlatform } from '../../domain/entities/KdsDevice';
import { PushTokenRepository } from '../../domain/repositories/pushToken';
import { AuthLogoutUsecase } from '../../domain/usecases/authLogout';
import { KdsDeviceRegisterUsecase } from '../../domain/usecases/kdsDeviceRegister';
import { KdsDeviceSetupHandler } from '../../presentation/handlers/kds/KdsDeviceSetupHandler';

export type KdsDeviceSetupProps = {
  // ExpoPushTokenRepository lives in data/native/ and is wired up by
  // apps/kds-mobile — see phase 5 of docs/prd-kds-order-notifications.md.
  pushTokenRepository: PushTokenRepository;
};

export function KdsDeviceSetup({ pushTokenRepository }: KdsDeviceSetupProps) {
  const client = new QueryClient();
  const kdsDeviceRepository = new ApiKdsDeviceRepository(client);
  const authRepository = new ApiAuthRepository();
  const platform: KdsPlatform = Platform.OS === 'ios' ? 'ios' : 'android';

  const kdsDeviceRegisterUsecase = new KdsDeviceRegisterUsecase(
    kdsDeviceRepository,
    pushTokenRepository,
    platform
  );
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <KdsDeviceSetupHandler
      kdsDeviceRegisterUsecase={kdsDeviceRegisterUsecase}
      kdsDeviceRepository={kdsDeviceRepository}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
