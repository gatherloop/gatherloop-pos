import { H2, Paragraph, XStack, YStack } from 'tamagui';
import { Navbar, Sidebar } from '../../base';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  CategoryListQueryResponse,
  categoryList,
} from '../../../../api-contract/src';
import { CategoryList } from '../components';

export const getCategoryListScreenInitialProps =
  async (): Promise<CategoryListScreenProps> => {
    const categoryListQueryResponse = await categoryList();
    return { categoryListQueryResponse };
  };

export type CategoryListScreenProps = {
  categoryListQueryResponse?: CategoryListQueryResponse;
};

export const CategoryListScreen = (props: CategoryListScreenProps) => {
  return (
    <XStack flex={1}>
      <Sidebar />
      <YStack flex={1}>
        <Navbar />
        <YStack padding="$5" gap="$3">
          <H2>Categories</H2>
          <Paragraph>Manage your product category</Paragraph>
          <CategoryList />
        </YStack>
      </YStack>
    </XStack>
  );
};
