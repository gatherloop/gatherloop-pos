import { TagHighlightEntry } from '../../../../utils/buildTagHighlights';
import { MenuHighlightCard } from './MenuHighlightCard';

export type MenuHighlightEntryCardProps = {
  entry: TagHighlightEntry;
  startingPriceByProductId: Record<number, number>;
  fullWidth?: boolean;
  onPress: (entry: TagHighlightEntry) => void;
};

export const MenuHighlightEntryCard = ({
  entry,
  startingPriceByProductId,
  fullWidth,
  onPress,
}: MenuHighlightEntryCardProps) =>
  entry.kind === 'variant' ? (
    <MenuHighlightCard
      name={entry.product.name}
      variantName={entry.variant.name}
      imageUrl={entry.variant.imageUrl || entry.product.imageUrl}
      station={entry.product.category.station}
      price={entry.variant.price}
      fullWidth={fullWidth}
      onPress={() => onPress(entry)}
    />
  ) : (
    <MenuHighlightCard
      name={entry.product.name}
      imageUrl={entry.product.imageUrl}
      station={entry.product.category.station}
      price={startingPriceByProductId[entry.product.id] ?? null}
      fullWidth={fullWidth}
      onPress={() => onPress(entry)}
    />
  );
