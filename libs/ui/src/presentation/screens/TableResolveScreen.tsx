import { ReactNode } from 'react';
import { match } from 'ts-pattern';
import { Text, XStack } from 'tamagui';
// Deep imports, not the `domain`/`components/base` barrels (D20): those
// barrels also re-export every POS usecase and Navbar/Sidebar — dead weight
// the customer bundle does not ship (D6).
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
  footer?: ReactNode;
};

// FR-4 in docs/prd-table-ordering.md: the three outcomes of resolving the
// table code from `/order/t/{code}`. `resolved` renders `children` so a
// later phase can drop the menu screen in here without touching this file.
// `footer` is the floating cart bar (FR-7 phase 10) — only meaningful once
// a table has actually resolved, so no other variant accepts it.
// EmptyView/LoadingView carry no copy of their own — unlike ErrorView, which
// hardcodes an English "Retry" label — so every string here stays Bahasa
// Indonesia per D15.
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
