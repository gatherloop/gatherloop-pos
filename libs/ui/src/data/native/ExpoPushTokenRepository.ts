import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { PermissionStatus as ExpoPermissionStatus } from 'expo-modules-core';
import {
  PermissionStatus,
  PushTokenRepository,
} from '../../domain/repositories/pushToken';

// Android channel id is versioned because a channel's sound is immutable
// once created — see docs/prd-kds-order-notifications.md D23.
export const ANDROID_ORDERS_CHANNEL_ID = 'orders-v2';

// Must match KDS_PUSH_SOUND on the API and the filename bundled via the
// expo-notifications plugin's `sounds` array in apps/kds-mobile/app.json (D23).
const ORDERS_CHANNEL_SOUND = 'order-alert.wav';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const toPermissionStatus = (
  status: ExpoPermissionStatus
): PermissionStatus => {
  switch (status) {
    case ExpoPermissionStatus.GRANTED:
      return 'granted';
    case ExpoPermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
};

export class ExpoPushTokenRepository implements PushTokenRepository {
  constructor() {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync(ANDROID_ORDERS_CHANNEL_ID, {
        name: 'Orders',
        importance: Notifications.AndroidImportance.MAX,
        sound: ORDERS_CHANNEL_SOUND,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    const { status } = await Notifications.getPermissionsAsync();
    return toPermissionStatus(status);
  }

  async requestPermission(): Promise<PermissionStatus> {
    const { status } = await Notifications.requestPermissionsAsync();
    return toPermissionStatus(status);
  }

  async getPushToken(): Promise<string> {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      throw new Error('Missing EAS projectId — run `eas init` first.');
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  }
}
