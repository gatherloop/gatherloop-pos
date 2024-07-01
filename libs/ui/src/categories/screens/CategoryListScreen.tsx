'use client';

import { H2, Paragraph, XStack, YStack } from 'tamagui';
import { Navbar, Sidebar, ListItem } from '../../base';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  CategoryListQueryResponse,
  categoryList,
  useCategoryList,
} from '../../../../api-contract/src';

export const getCategoryListScreenInitialProps =
  async (): Promise<CategoryListScreenProps> => {
    const categoryListQueryResponse = await categoryList();
    return { categoryListQueryResponse };
  };

export type CategoryListScreenProps = {
  categoryListQueryResponse?: CategoryListQueryResponse;
};

export const CategoryListScreen = (props: CategoryListScreenProps) => {
  const { data } = useCategoryList({
    query: { initialData: props.categoryListQueryResponse },
  });
  return (
    <XStack flex={1}>
      <Sidebar />
      <YStack flex={1}>
        <Navbar />
        <YStack padding="$5" gap="$3">
          <H2>Categories</H2>
          <Paragraph>Manage your product category</Paragraph>
          <XStack gap="$3" flexWrap="wrap">
            {data?.data.map((category, index) => (
              <ListItem
                key={index}
                title={category.name}
                subtitle={category.description}
                thumbnailSrc={category.imageUrl}
                $xs={{ flexBasis: '100%' }}
                $sm={{ flexBasis: '40%' }}
                flexBasis="30%"
              />
            ))}
          </XStack>
        </YStack>
      </YStack>
    </XStack>
  );
};
