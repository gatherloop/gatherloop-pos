import { OrderLayout } from '@gatherloop-pos/ui/order';
import { H2, Paragraph } from 'tamagui';

// Stands in for the real menu/table-resolution screens (FR-4/FR-5) that
// land in later phases. Phase 4 only needs to prove the SPA boots, mounts
// RootProvider, and renders inside OrderLayout — Bahasa Indonesia copy per
// D15, even for a placeholder.
export const PlaceholderScreen = () => (
  <OrderLayout>
    <H2>Gatherloop Order</H2>
    <Paragraph>Menu akan segera hadir di sini.</Paragraph>
  </OrderLayout>
);
