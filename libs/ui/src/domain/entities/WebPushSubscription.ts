export type WebPushConfig = {
  vapidPublicKey: string;
};

export type WebPushSubscription = {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent?: string;
};
