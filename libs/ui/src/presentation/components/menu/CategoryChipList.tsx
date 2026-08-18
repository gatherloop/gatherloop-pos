import { Button, ScrollView, XStack } from 'tamagui';
import { Category } from '../../../domain/entities/Category';

// FR-5 in docs/prd-table-ordering.md: the horizontal category chip row
// above the menu sections. `null` always renders first as "Semua" (D15 —
// Bahasa Indonesia copy) so a guest can clear the filter back to the full
// menu. Stickiness is the screen's concern (MenuListScreen sticks this
// together with the search field in one shared container) — this component
// only renders the row itself.
export type CategoryChipListProps = {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
};

export const CategoryChipList = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryChipListProps) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap="$2" paddingVertical="$2">
        <Button
          size="$3"
          borderRadius="$10"
          theme={selectedCategoryId === null ? 'blue' : undefined}
          onPress={() => onSelectCategory(null)}
        >
          Semua
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            size="$3"
            borderRadius="$10"
            theme={selectedCategoryId === category.id ? 'blue' : undefined}
            onPress={() => onSelectCategory(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </XStack>
    </ScrollView>
  );
};
