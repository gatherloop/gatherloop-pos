import { Button, H2, Paragraph, XStack, YStack } from 'tamagui';
import { Navbar, Sidebar } from '../../base';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  CategoryListQueryResponse,
  categoryList,
} from '../../../../api-contract/src';
import { CategoryList } from '../components';
import { useRouter } from 'solito/router';

export const getCategoryListScreenInitialProps =
  async (): Promise<CategoryListScreenProps> => {
    const categoryListQueryResponse = await categoryList();
    return { categoryListQueryResponse };
  };

export type CategoryListScreenProps = {
  categoryListQueryResponse?: CategoryListQueryResponse;
};

export const CategoryListScreen = (props: CategoryListScreenProps) => {
  const router = useRouter();
  return (
    <XStack flex={1}>
      <Sidebar />
      <YStack flex={1}>
        <Navbar />
        <YStack padding="$5" gap="$3">
          <XStack>
            <YStack>
              <H2>Categories</H2>
              <Paragraph>Manage your product category</Paragraph>
            </YStack>
            <Button onPress={() => router.push('/categories/create')}>
              Create Category
            </Button>
          </XStack>
          <CategoryList />
        </YStack>
      </YStack>
    </XStack>
  );
};
