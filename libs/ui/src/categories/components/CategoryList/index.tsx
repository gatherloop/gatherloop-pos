import { ListItem } from '../../../base';
import { Button, H4, Paragraph, Spinner, XStack, YStack } from 'tamagui';
import { useCategoryListState } from './state';
import { AlertCircle, Box } from '@tamagui/lucide-icons';

export const CategoryList = () => {
  const { data, refetch, status } = useCategoryListState();
  return (
    <XStack gap="$3" flexWrap="wrap">
      {status === 'pending' ? (
        <YStack justifyContent="center" alignItems="center" flex={1} gap="$3">
          <Spinner size="large" />
          <Paragraph>Loading Categories...</Paragraph>
        </YStack>
      ) : status === 'success' ? (
        (data?.data.length ?? 0) > 0 ? (
          data?.data.map((category, index) => (
            <ListItem
              key={index}
              title={category.name}
              subtitle={category.description}
              thumbnailSrc={category.imageUrl}
              $xs={{ flexBasis: '100%' }}
              $sm={{ flexBasis: '40%' }}
              flexBasis="30%"
            />
          ))
        ) : (
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
            <Box size="$5" />
            <H4 textAlign="center">Oops, Category is Empty</H4>
            <Paragraph textAlign="center">Please create a new one</Paragraph>
          </YStack>
        )
      ) : (
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
          <AlertCircle size="$5" color="$red10" />
          <YStack>
            <H4 textAlign="center">Oops, Failed to Get Categories</H4>
            <Paragraph textAlign="center">
              Please click the retry button to refetch data
            </Paragraph>
          </YStack>
          <Button onPress={() => refetch()}>Retry</Button>
        </YStack>
      )}
    </XStack>
  );
};
