import { ReactNode } from 'react';
import { match } from 'ts-pattern';
import { Text, XStack } from 'tamagui';
// Deep imports, not the `domain`/`components/base` barrels (D20): those
// barrels also re-export every POS usecase and Navbar/Sidebar, which pull
// in solito/next — dead weight a Vite build has no business resolving.
import { PublicTable } from '../../domain/entities/PublicTable';
import { EmptyView } from '../components/base/EmptyView';
import { LoadingView } from '../components/base/LoadingView';
import { OrderLayout } from '../components/base/OrderLayout';

export type TableResolveScreenVariant =
  | { type: 'resolving' }
  | { type: 'resolved'; table: PublicTable }
  | { type: 'invalidQr' }
  | { type: 'noQr' }
  | { type: 'error'; onRetryButtonPress: () => void };

export type TableResolveScreenProps = {
  variant: TableResolveScreenVariant;
  children?: ReactNode;
};

// FR-4 in docs/prd-table-ordering.md: the three outcomes of resolving the
// table code from `/order/t/{code}`. `resolved` renders `children` so a
// later phase can drop the menu screen in here without touching this file.
// EmptyView/LoadingView carry no copy of their own — unlike ErrorView, which
// hardcodes an English "Retry" label — so every string here stays Bahasa
// Indonesia per D15.
export const TableResolveScreen = ({
  variant,
  children,
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
          <XStack padding="$4" backgroundColor="$color2">
            <Text fontWeight="bold">{table.label}</Text>
          </XStack>
        }
      >
        {children ?? <Text>Menu akan segera hadir di sini.</Text>}
      </OrderLayout>
    ))
    .exhaustive();
