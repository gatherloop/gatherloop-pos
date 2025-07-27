import {
  ApiVariantRepository,
  ApiWalletRepository,
  getUrlFromCtx,
  TransactionCreateScreen,
  TransactionCreateScreenProps,
  UrlVariantListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  TransactionCreateScreenProps
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
  const variantRepository = new ApiVariantRepository(client);
  const variantListQueryRepository = new UrlVariantListQueryRepository();
  const walletRepository = new ApiWalletRepository(client);

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

  const wallets = await walletRepository.fetchWalletList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: {
      variantListParams: {
        variants,
        totalItem,
        itemPerPage,
        orderBy,
        page,
        query,
        sortBy,
      },
      transactionPayParams: {
        wallets,
      },
    },
  };
};

export default TransactionCreateScreen;
