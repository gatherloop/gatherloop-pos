import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { Tag } from '../../../../domain/entities/Tag';
import { TagHighlightEntry } from '../../../../utils/buildTagHighlights';
import { MenuHighlightCard } from './MenuHighlightCard';

export type MenuHighlightSectionProps = {
  tag: Tag;
  entries: TagHighlightEntry[];
  startingPriceByProductId: Record<number, number>;
  onEntryPress: (entry: TagHighlightEntry) => void;
};

export const MenuHighlightSection = ({
  tag,
  entries,
  startingPriceByProductId,
  onEntryPress,
}: MenuHighlightSectionProps) => (
  <YStack gap="$3">
    <Text fontSize="$6" fontWeight="bold">
      {tag.name}
    </Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap="$3">
        {entries.map((entry) =>
          entry.kind === 'variant' ? (
            <MenuHighlightCard
              key={`variant-${entry.variant.id}`}
              name={entry.product.name}
              variantName={entry.variant.name}
              imageUrl={entry.variant.imageUrl || entry.product.imageUrl}
              station={entry.product.category.station}
              price={entry.variant.price}
              onPress={() => onEntryPress(entry)}
            />
          ) : (
            <MenuHighlightCard
              key={`product-${entry.product.id}`}
              name={entry.product.name}
              imageUrl={entry.product.imageUrl}
              station={entry.product.category.station}
              price={startingPriceByProductId[entry.product.id] ?? null}
              onPress={() => onEntryPress(entry)}
            />
          )
        )}
      </XStack>
    </ScrollView>
  </YStack>
);
