import {
  ApiMaterialRepository,
  StockCheckCreate,
  StockCheckCreateProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  StockCheckCreateProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const client = new QueryClient();
  const materialRepository = new ApiMaterialRepository(client);

  const { materials } = await materialRepository.fetchMaterialList(
    {
      page: 1,
      itemPerPage: 1000,
      orderBy: 'asc',
      query: '',
      sortBy: 'created_at',
    },
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  return {
    props: {
      stockCheckCreateParams: {
        items: materials.map((material) => ({
          materialId: material.id,
          materialName: material.name,
          purchaseUnit: material.purchaseUnit,
          currentStock: null,
        })),
      },
    },
  };
};

export default StockCheckCreate;
