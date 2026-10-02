import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { Tag } from '../../../../domain/entities/Tag';
import { TagHighlightEntry } from '../../../../utils/buildTagHighlights';
import { MenuHighlightEntryCard } from './MenuHighlightEntryCard';

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
        {entries.map((entry) => (
          <MenuHighlightEntryCard
            key={
              entry.kind === 'variant'
                ? `variant-${entry.variant.id}`
                : `product-${entry.product.id}`
            }
            entry={entry}
            startingPriceByProductId={startingPriceByProductId}
            onPress={onEntryPress}
          />
        ))}
      </XStack>
    </ScrollView>
  </YStack>
);
