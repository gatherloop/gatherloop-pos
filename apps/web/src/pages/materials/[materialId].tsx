import {
  ApiMaterialRepository,
  ApiSupplierRepository,
  MaterialUpdate,
  MaterialUpdateProps,
  UrlSupplierListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  MaterialUpdateProps,
  { materialId: string }
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
  const supplierRepository = new ApiSupplierRepository(client);
  const supplierListQueryRepository = new UrlSupplierListQueryRepository();

  const materialId = parseInt(ctx.params?.materialId ?? '');
  const [material, { suppliers, totalItem }] = await Promise.all([
    materialRepository.fetchMaterialById(materialId, {
      headers: { Cookie: ctx.req.headers.cookie },
    }),
    supplierRepository.fetchSupplierList(
      {
        page: supplierListQueryRepository.getPage(),
        itemPerPage: 100,
        query: '',
        sortBy: supplierListQueryRepository.getSortBy(),
        orderBy: supplierListQueryRepository.getOrderBy(),
      },
      { headers: { Cookie: ctx.req.headers.cookie } }
    ),
  ]);

  return {
    props: {
      materialUpdateParams: { material, materialId },
      supplierListParams: { suppliers, totalItem },
    },
  };
};

export default MaterialUpdate;
