import { ReactNode } from 'react';
import { match } from 'ts-pattern';
import { Text, XStack } from 'tamagui';
import { PublicTable } from '../../../../domain/entities/PublicTable';
import { EmptyView } from '../../components/base/EmptyView';
import { LoadingView } from '../../components/base/LoadingView';
import { OrderLayout } from '../../components/base/OrderLayout';

export type TableResolveScreenVariant =
  | { type: 'resolving' }
  | { type: 'resolved'; table: PublicTable }
  | { type: 'invalidQr' }
  | { type: 'noQr' }
  | { type: 'error'; onRetryButtonPress: () => void };

export type TableResolveScreenProps = {
  variant: TableResolveScreenVariant;
  children?: ReactNode;
  footer?: ReactNode;
};

export const TableResolveScreen = ({
  variant,
  children,
  footer,
}: TableResolveScreenProps) =>
  match(variant)
    .returnType<ReactNode>()
    .with({ type: 'resolving' }, () => (
      <OrderLayout>
        <LoadingView title="Memuat meja..." />
      </OrderLayout>
    ))
    .with({ type: 'invalidQr' }, () => (
      <OrderLayout>
        <EmptyView
          title="QR tidak valid"
          subtitle="Silakan pindai ulang kode QR di meja Anda."
        />
      </OrderLayout>
    ))
    .with({ type: 'noQr' }, () => (
      <OrderLayout>
        <EmptyView
          title="Pindai QR di meja Anda"
          subtitle="Pindai kode QR di meja Anda untuk mulai memesan."
        />
      </OrderLayout>
    ))
    .with({ type: 'error' }, ({ onRetryButtonPress }) => (
      <OrderLayout>
        <EmptyView
          title="Gagal memuat meja"
          subtitle="Terjadi kesalahan. Silakan coba lagi."
          actionLabel="Coba Lagi"
          onActionPress={onRetryButtonPress}
        />
      </OrderLayout>
    ))
    .with({ type: 'resolved' }, ({ table }) => (
      <OrderLayout
        header={
          <XStack padding="$4" backgroundColor="$color2" flexWrap="wrap">
            <Text fontWeight="bold">{table.label}</Text>
            <Text color="$color10"> · Lantai {table.floorNumber}</Text>
          </XStack>
        }
        footer={footer}
      >
        {children ?? <Text>Menu akan segera hadir di sini.</Text>}
      </OrderLayout>
    ))
    .exhaustive();
