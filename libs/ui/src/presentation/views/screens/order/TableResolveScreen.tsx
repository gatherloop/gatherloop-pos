import { ReactNode } from 'react';
import { match } from 'ts-pattern';
import { Text } from 'tamagui';
import { PublicTable } from '../../../../domain/entities/PublicTable';
import { EmptyView } from '../../components/base/EmptyView';
import { LoadingView } from '../../components/base/LoadingView';
import { OrderBrandHeader } from '../../components/base/OrderBrandHeader';
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
  onHistoryPress?: () => void;
  preparingCount?: number;
};

export const TableResolveScreen = ({
  variant,
  children,
  footer,
  onHistoryPress,
  preparingCount,
}: TableResolveScreenProps) =>
  match(variant)
    .returnType<ReactNode>()
    .with({ type: 'resolving' }, () => (
      <OrderLayout
        header={
          <OrderBrandHeader
            onHistoryPress={onHistoryPress}
            preparingCount={preparingCount}
          />
        }
      >
        <LoadingView title="Memuat meja..." />
      </OrderLayout>
    ))
    .with({ type: 'invalidQr' }, () => (
      <OrderLayout
        header={
          <OrderBrandHeader
            onHistoryPress={onHistoryPress}
            preparingCount={preparingCount}
          />
        }
      >
        <EmptyView
          title="QR tidak valid"
          subtitle="Silakan pindai ulang kode QR di meja Anda."
        />
      </OrderLayout>
    ))
    .with({ type: 'noQr' }, () => (
      <OrderLayout
        header={
          <OrderBrandHeader
            onHistoryPress={onHistoryPress}
            preparingCount={preparingCount}
          />
        }
      >
        <EmptyView
          title="Pindai QR di meja Anda"
          subtitle="Pindai kode QR di meja Anda untuk mulai memesan."
        />
      </OrderLayout>
    ))
    .with({ type: 'error' }, ({ onRetryButtonPress }) => (
      <OrderLayout
        header={
          <OrderBrandHeader
            onHistoryPress={onHistoryPress}
            preparingCount={preparingCount}
          />
        }
      >
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
          <OrderBrandHeader
            tableLine={`${table.label} · Lantai ${table.floorNumber}`}
            onHistoryPress={onHistoryPress}
            preparingCount={preparingCount}
          />
        }
        footer={footer}
      >
        {children ?? <Text>Menu akan segera hadir di sini.</Text>}
      </OrderLayout>
    ))
    .exhaustive();
