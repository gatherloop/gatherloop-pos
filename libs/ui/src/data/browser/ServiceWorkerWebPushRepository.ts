import { WebPushSubscription } from '../../domain/entities/WebPushSubscription';
import { PermissionStatus } from '../../domain/repositories/pushToken';
import {
  WebPushRepository,
  WebPushSupportStatus,
} from '../../domain/repositories/webPush';

const SERVICE_WORKER_URL = '/sw.js';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64Safe);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  let binary = '';
  new Uint8Array(buffer).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function toPermissionStatus(
  permission: NotificationPermission
): PermissionStatus {
  switch (permission) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    default:
      return 'undetermined';
  }
}

function toWebPushSubscription(
  subscription: PushSubscription
): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    p256dhKey: arrayBufferToBase64Url(subscription.getKey('p256dh')),
    authKey: arrayBufferToBase64Url(subscription.getKey('auth')),
    userAgent: navigator.userAgent,
  };
}

export class ServiceWorkerWebPushRepository implements WebPushRepository {
  getSupportStatus(): WebPushSupportStatus {
    const hasPushManager =
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      typeof window !== 'undefined' &&
      'PushManager' in window;
    if (hasPushManager) return 'supported';

    const iosStandalone = (navigator as Navigator & { standalone?: boolean })
      .standalone;
    if (iosStandalone === false) return 'needsInstall';

    return 'unsupported';
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    return toPermissionStatus(Notification.permission);
  }

  async requestPermission(): Promise<PermissionStatus> {
    const permission = await Notification.requestPermission();
    return toPermissionStatus(permission);
  }

  async subscribe(vapidPublicKey: string): Promise<WebPushSubscription> {
    await navigator.serviceWorker.register(SERVICE_WORKER_URL);
    const registration = await navigator.serviceWorker.ready;
    const pushSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    return toWebPushSubscription(pushSubscription);
  }

  async getSubscription(): Promise<WebPushSubscription | null> {
    const registration = await navigator.serviceWorker.getRegistration(
      SERVICE_WORKER_URL
    );
    const pushSubscription = await registration?.pushManager.getSubscription();
    return pushSubscription ? toWebPushSubscription(pushSubscription) : null;
  }

  async unsubscribe(): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration(
      SERVICE_WORKER_URL
    );
    const pushSubscription = await registration?.pushManager.getSubscription();
    await pushSubscription?.unsubscribe();
  }
}
