import { H3, Paragraph, ScrollView, YStack } from 'tamagui';
import { Layout } from '../../base';
import { CategoryForm } from '../components';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  categoryFindById,
  categoryFindByIdQueryKey,
} from '../../../../api-contract/src';
import { DehydratedState, QueryClient, dehydrate } from '@tanstack/react-query';
import { createParam } from 'solito';

type Params = {
  categoryId: number;
};

const { useParams } = createParam<Params>();

export const getCategoryUpdateScreenDehydratedState = async (
  categoryId: number
): Promise<DehydratedState> => {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: categoryFindByIdQueryKey(categoryId),
    queryFn: (ctx) => categoryFindById(ctx.queryKey[0].params.categoryId),
  });

  return dehydrate(queryClient);
};

export type CategoryUpdateScreenProps = {
  categoryId?: number;
};

export const CategoryUpdateScreen = (props: CategoryUpdateScreenProps) => {
  const { params } = useParams();
  return (
    <Layout>
      <YStack>
        <H3>Update Category</H3>
        <Paragraph>Update your existing category</Paragraph>
      </YStack>
      <ScrollView>
        <CategoryForm
          variant={{
            type: 'update',
            categoryId: props.categoryId ?? params.categoryId,
          }}
        />
      </ScrollView>
    </Layout>
  );
};
