import { Button, Input, Paragraph, Spinner, XStack, YStack } from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import {
  FormErrorBanner,
  Layout,
  TagAssignmentList,
  TagAssignmentListProps,
} from '../../components';

export type TagAssignmentScreenProps = {
  onLogoutPress: () => void;
  tagName?: string;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  variant: TagAssignmentListProps['variant'];
  onRetryButtonPress: () => void;
  onProductToggle: (productId: number) => void;
  onVariantToggle: (variantId: number) => void;
  selectedVariantCount: number;
  onSavePress: () => void;
  isSaveDisabled: boolean;
  isSaving: boolean;
  serverError?: string;
};

export const TagAssignmentScreen = ({
  onLogoutPress,
  tagName,
  searchValue,
  onSearchValueChange,
  variant,
  onRetryButtonPress,
  onProductToggle,
  onVariantToggle,
  selectedVariantCount,
  onSavePress,
  isSaveDisabled,
  isSaving,
  serverError,
}: TagAssignmentScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title={tagName ? `Assign "${tagName}"` : 'Assign Tag'}
      showBackButton
    >
      <YStack gap="$3" flex={1}>
        <FormErrorBanner message={serverError} />
        <XStack gap="$3">
          <Input
            placeholder="Search Products by Name"
            value={searchValue}
            onChangeText={onSearchValueChange}
            flex={1}
          />
          <Button
            icon={X}
            onPress={() => onSearchValueChange('')}
            accessibilityLabel="Clear search"
            circular
          />
        </XStack>
        <TagAssignmentList
          variant={variant}
          onRetryButtonPress={onRetryButtonPress}
          onProductToggle={onProductToggle}
          onVariantToggle={onVariantToggle}
        />
        <Paragraph size="$2" color="$gray10">
          {`${selectedVariantCount} ${
            selectedVariantCount === 1 ? 'variant' : 'variants'
          } selected`}
        </Paragraph>
        <Button
          disabled={isSaveDisabled}
          onPress={onSavePress}
          theme="blue"
          icon={isSaving ? <Spinner /> : undefined}
        >
          Save
        </Button>
      </YStack>
    </Layout>
  );
};
