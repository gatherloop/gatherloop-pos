import {
  ApiVariantRepository,
  ApiTransactionRepository,
  getUrlFromCtx,
  TransactionUpdateScreen,
  TransactionUpdateScreenProps,
  UrlVariantListQueryRepository,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  TransactionUpdateScreenProps,
  { transactionId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const client = new QueryClient();
  const transactionRepository = new ApiTransactionRepository(client);
  const variantRepository = new ApiVariantRepository(client);
  const variantListQueryRepository = new UrlVariantListQueryRepository();

  const transactionId = parseInt(ctx.params?.transactionId ?? '');
  const transaction = await transactionRepository.fetchTransactionById(
    transactionId,
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  const url = getUrlFromCtx(ctx);
  const page = variantListQueryRepository.getPage(url);
  const itemPerPage = variantListQueryRepository.getItemPerPage(url);
  const query = variantListQueryRepository.getSearchQuery(url);
  const orderBy = variantListQueryRepository.getOrderBy(url);
  const sortBy = variantListQueryRepository.getSortBy(url);

  const { variants, totalItem } = await variantRepository.fetchVariantList(
    { page, itemPerPage, orderBy, query, sortBy },
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  return {
    props: {
      transactionUpdateParams: { transaction, transactionId },
      variantListParams: {
        variants,
        totalItem,
        itemPerPage,
        orderBy,
        page,
        query,
        sortBy,
      },
    },
  };
};

export default TransactionUpdateScreen;
