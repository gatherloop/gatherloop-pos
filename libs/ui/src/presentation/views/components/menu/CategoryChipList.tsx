import { Button, ScrollView, XStack } from 'tamagui';
import { Category } from '../../../../domain/entities/Category';
import { Tag } from '../../../../domain/entities/Tag';
import { tagColorBackground, tagColorForeground } from '../tags/tagColors';

export type CategoryChipListProps = {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  tags?: Tag[];
  selectedTagId?: number | null;
  onSelectTag?: (tagId: number) => void;
};

export const CategoryChipList = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  tags = [],
  selectedTagId = null,
  onSelectTag,
}: CategoryChipListProps) => {
  const isAllSelected = selectedCategoryId === null && selectedTagId === null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap="$2" paddingVertical="$2">
        <Button
          size="$3"
          borderRadius="$10"
          theme={isAllSelected ? 'blue' : undefined}
          onPress={() => onSelectCategory(null)}
        >
          Semua
        </Button>
        {tags.map((tag) => {
          const isSelected = selectedTagId === tag.id;
          return (
            <Button
              key={`tag-${tag.id}`}
              size="$3"
              borderRadius="$10"
              backgroundColor={tagColorBackground(tag.color)}
              color={tagColorForeground(tag.color)}
              borderWidth={2}
              borderColor={
                isSelected ? tagColorForeground(tag.color) : 'transparent'
              }
              aria-pressed={isSelected}
              onPress={() => onSelectTag?.(tag.id)}
            >
              {tag.name}
            </Button>
          );
        })}
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
