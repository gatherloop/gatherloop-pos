import {
  ApiPurchaseListRepository,
  StockCheckPurchaseList,
  StockCheckPurchaseListProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  StockCheckPurchaseListProps,
  { id: string }
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
  const purchaseListRepository = new ApiPurchaseListRepository(client);

  const stockCheckId = parseInt(ctx.params?.id ?? '');
  const purchaseList = await purchaseListRepository.fetchPurchaseList(
    stockCheckId,
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  return {
    props: {
      purchaseListGetParams: {
        stockCheckId,
        purchaseList,
      },
    },
  };
};

function PurchaseListPage(props: StockCheckPurchaseListProps) {
  return (
    <StockCheckPurchaseList
      {...props}
      getMaterialEditUrl={(materialId) => `/materials/${materialId}`}
    />
  );
}

export default PurchaseListPage;
