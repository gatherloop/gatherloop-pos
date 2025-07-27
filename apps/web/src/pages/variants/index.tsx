import {
  ApiVariantRepository,
  getUrlFromCtx,
  VariantListScreen,
  VariantListScreenProps,
  UrlVariantListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  VariantListScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const client = new QueryClient();
  const variantRepository = new ApiVariantRepository(client);
  const variantListQueryRepository = new UrlVariantListQueryRepository();

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
      variantListParams: {
        page,
        itemPerPage,
        totalItem,
        orderBy,
        variants,
        query,
        sortBy,
      },
    },
  };
};

export default VariantListScreen;
