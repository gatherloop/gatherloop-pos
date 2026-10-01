import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Minus } from '@tamagui/lucide-icons';
import {
  Checkbox,
  H5,
  Paragraph,
  ScrollView,
  Text,
  XStack,
  YStack,
} from 'tamagui';
import { match } from 'ts-pattern';
import { EmptyView, ErrorView, SkeletonList } from '../base';

export type TagAssignmentCheckState = boolean | 'indeterminate';

export type TagAssignmentVariantItem = {
  id: number;
  name: string;
  isChecked: boolean;
};

export type TagAssignmentProductItem = {
  id: number;
  name: string;
  checkState: TagAssignmentCheckState;
  variants: TagAssignmentVariantItem[];
};

export type TagAssignmentCategoryItem = {
  id: number;
  name: string;
  products: TagAssignmentProductItem[];
};

export type TagAssignmentListProps = {
  onRetryButtonPress: () => void;
  onProductToggle: (productId: number) => void;
  onVariantToggle: (variantId: number) => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; categories: TagAssignmentCategoryItem[] };
};

type TagAssignmentCheckboxProps = {
  label: string;
  checked: TagAssignmentCheckState;
  onToggle: () => void;
};

const TagAssignmentCheckbox = ({
  label,
  checked,
  onToggle,
}: TagAssignmentCheckboxProps) => (
  <Checkbox
    size="$4"
    checked={checked}
    onCheckedChange={onToggle}
    accessibilityLabel={label}
  >
    <Checkbox.Indicator>
      {checked === 'indeterminate' ? <Minus /> : <Check />}
    </Checkbox.Indicator>
  </Checkbox>
);

type TagAssignmentProductRowProps = {
  product: TagAssignmentProductItem;
  onProductToggle: (productId: number) => void;
  onVariantToggle: (variantId: number) => void;
};

const TagAssignmentProductRow = ({
  product,
  onProductToggle,
  onVariantToggle,
}: TagAssignmentProductRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasVariantLayer = product.variants.length > 1;
  const checkedVariantCount = product.variants.filter(
    (variant) => variant.isChecked
  ).length;

  return (
    <YStack>
      <XStack alignItems="center" gap="$3" paddingVertical="$2">
        <TagAssignmentCheckbox
          label={product.name}
          checked={product.checkState}
          onToggle={() => onProductToggle(product.id)}
        />
        <Text flex={1} fontSize="$5">
          {product.name}
        </Text>
        {hasVariantLayer && (
          <XStack
            alignItems="center"
            gap="$1"
            onPress={() => setIsExpanded(!isExpanded)}
            accessibilityRole="button"
            accessibilityLabel={`${isExpanded ? 'Hide' : 'Show'} variants of ${
              product.name
            }`}
          >
            <Paragraph size="$2" color="$gray10">
              {`${checkedVariantCount}/${product.variants.length} variants`}
            </Paragraph>
            {isExpanded ? (
              <ChevronDown size="$1" />
            ) : (
              <ChevronRight size="$1" />
            )}
          </XStack>
        )}
      </XStack>
      {hasVariantLayer && isExpanded && (
        <YStack paddingLeft="$6">
          {product.variants.map((variant) => (
            <XStack
              key={variant.id}
              alignItems="center"
              gap="$3"
              paddingVertical="$1.5"
            >
              <TagAssignmentCheckbox
                label={`${product.name} ${variant.name}`}
                checked={variant.isChecked}
                onToggle={() => onVariantToggle(variant.id)}
              />
              <Text flex={1}>{variant.name}</Text>
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
};

export const TagAssignmentList = ({
  onRetryButtonPress,
  onProductToggle,
  onVariantToggle,
  variant,
}: TagAssignmentListProps) => {
  return (
    <YStack flex={1}>
      {match(variant)
        .with({ type: 'loading' }, () => <SkeletonList />)
        .with({ type: 'empty' }, () => (
          <EmptyView
            title="Oops, Product is Empty"
            subtitle="No product matches your search"
          />
        ))
        .with({ type: 'loaded' }, ({ categories }) => (
          <ScrollView>
            <YStack gap="$4">
              {categories.map((category) => (
                <YStack key={category.id} gap="$1">
                  <H5>{category.name}</H5>
                  {category.products.map((product) => (
                    <TagAssignmentProductRow
                      key={product.id}
                      product={product}
                      onProductToggle={onProductToggle}
                      onVariantToggle={onVariantToggle}
                    />
                  ))}
                </YStack>
              ))}
            </YStack>
          </ScrollView>
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Products"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .exhaustive()}
    </YStack>
  );
};
