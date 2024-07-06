import { Button, H3, Paragraph, ScrollView, XStack, YStack } from 'tamagui';
import { Layout } from '../../base';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryList,
  categoryListQueryKey,
} from '../../../../api-contract/src';
import { CategoryList } from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';

export const getCategoryListScreenDehydratedState =
  async (): Promise<DehydratedState> => {
    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
      queryKey: categoryListQueryKey(),
      queryFn: categoryList,
    });

    return dehydrate(queryClient);
  };

export const CategoryListScreen = () => {
  return (
    <Layout>
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
    </Layout>
  );
};
