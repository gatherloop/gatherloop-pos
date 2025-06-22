import {
  ApiMaterialRepository,
  MaterialUpdateScreen,
  MaterialUpdateScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  MaterialUpdateScreenProps,
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

  const materialId = parseInt(ctx.params?.materialId ?? '');
  const material = await materialRepository.fetchMaterialById(materialId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return { props: { materialUpdateParams: { material, materialId } } };
};

export default MaterialUpdateScreen;
