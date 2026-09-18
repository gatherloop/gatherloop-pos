import { ReactNode } from 'react';
import { Bell, BellOff } from '@tamagui/lucide-icons';
import { match, P } from 'ts-pattern';
import { Button, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui';

export type OrderNotificationOptInVariant =
  | { type: 'hidden' }
  | { type: 'idle'; onSubscribePress: () => void }
  | { type: 'needsInstall' }
  | { type: 'checkingPermission' }
  | { type: 'permissionDenied' }
  | { type: 'subscribing' }
  | { type: 'subscribeError'; errorMessage: string; onRetryPress: () => void }
  | { type: 'subscribed'; onUnsubscribePress: () => void }
  | { type: 'unsubscribing' };

export type OrderNotificationOptInProps = {
  variant: OrderNotificationOptInVariant;
};

const OptInCard = ({ children }: { children: ReactNode }) => (
  <YStack
    width="100%"
    maxWidth={420}
    gap="$2"
    padding="$3"
    borderRadius="$4"
    borderWidth={1}
    borderColor="$orange6"
    backgroundColor="$orange2"
  >
    {children}
  </YStack>
);

export const OrderNotificationOptIn = ({ variant }: OrderNotificationOptInProps) =>
  match(variant)
    .returnType<ReactNode>()
    .with({ type: 'hidden' }, () => null)
    .with({ type: 'needsInstall' }, () => (
      <OptInCard>
        <XStack alignItems="center" gap="$2">
          <Bell size="$1.5" color="$orange10" />
          <Text fontWeight="bold">Tidak perlu menunggu di halaman ini</Text>
        </XStack>
        <Paragraph color="$color10">
          Tambahkan halaman ini ke Layar Utama untuk mendapat notifikasi saat
          pesanan siap: ketuk tombol Share lalu pilih &quot;Tambahkan ke Layar
          Utama&quot;.
        </Paragraph>
      </OptInCard>
    ))
    .with({ type: 'permissionDenied' }, () => (
      <OptInCard>
        <Text fontWeight="bold">Notifikasi dinonaktifkan</Text>
        <Paragraph color="$color10">
          Aktifkan kembali izin notifikasi di pengaturan browser Anda untuk
          mendapat kabar saat pesanan siap.
        </Paragraph>
      </OptInCard>
    ))
    .with({ type: P.union('checkingPermission', 'subscribing') }, () => (
      <OptInCard>
        <XStack alignItems="center" gap="$2">
          <Spinner size="small" />
          <Text>Mengaktifkan notifikasi...</Text>
        </XStack>
      </OptInCard>
    ))
    .with({ type: 'subscribeError' }, ({ errorMessage, onRetryPress }) => (
      <OptInCard>
        <Text fontWeight="bold" color="$red10">
          {errorMessage}
        </Text>
        <Button size="$3" onPress={onRetryPress}>
          Coba lagi
        </Button>
      </OptInCard>
    ))
    .with({ type: P.union('subscribed', 'unsubscribing') }, (state) => (
      <XStack
        width="100%"
        maxWidth={420}
        alignItems="center"
        justifyContent="space-between"
        gap="$2"
        padding="$3"
      >
        <XStack alignItems="center" gap="$2">
          <Bell size="$1" color="$green10" />
          <Text color="$color10">Kami akan memberi tahu saat pesanan siap.</Text>
        </XStack>
        <Button
          size="$2"
          chromeless
          icon={BellOff}
          disabled={state.type === 'unsubscribing'}
          onPress={
            state.type === 'subscribed' ? state.onUnsubscribePress : undefined
          }
        >
          Matikan
        </Button>
      </XStack>
    ))
    .with({ type: 'idle' }, ({ onSubscribePress }) => (
      <OptInCard>
        <XStack alignItems="center" gap="$2">
          <Bell size="$1.5" color="$orange10" />
          <Text fontWeight="bold">Tidak perlu menunggu di halaman ini</Text>
        </XStack>
        <Paragraph color="$color10">Kami beri tahu saat pesanan siap.</Paragraph>
        <Button theme="orange" size="$4" minHeight={44} onPress={onSubscribePress}>
          Beri tahu saya
        </Button>
      </OptInCard>
    ))
    .exhaustive();
