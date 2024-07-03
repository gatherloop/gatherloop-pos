import { Button, H3, Paragraph, ScrollView, XStack, YStack } from 'tamagui';
import { Navbar, Sidebar } from '../../base';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  CategoryListQueryResponse,
  categoryList,
} from '../../../../api-contract/src';
import { CategoryList } from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';

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
        <YStack padding="$5" gap="$3" flex={1}>
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <H3>Categories</H3>
              <Paragraph>Manage your product category</Paragraph>
            </YStack>
            <Link href="/categories/create">
              <Button size="$3" icon={Plus} variant="outlined" disabled />
            </Link>
          </XStack>
          <ScrollView>
            <CategoryList />
          </ScrollView>
        </YStack>
      </YStack>
    </XStack>
  );
};
