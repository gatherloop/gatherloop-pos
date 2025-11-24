import {
  ApiSupplierRepository,
  SupplierUpdateScreen,
  SupplierUpdateScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  SupplierUpdateScreenProps,
  { supplierId: string }
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
  const supplierRepository = new ApiSupplierRepository(client);

  const supplierId = parseInt(ctx.params?.supplierId ?? '');
  const supplier = await supplierRepository.fetchSupplierById(supplierId, {
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return { props: { supplierUpdateParams: { supplier, supplierId } } };
};

export default SupplierUpdateScreen;
