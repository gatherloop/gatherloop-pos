import {
  ApiMenuRepository,
  ApiPublicTableRepository,
  getUrlFromCtx,
  resolveSession,
  SESSION_ID_COOKIE_NAME,
  TableNotFoundError,
  UrlMenuListQueryRepository,
} from '@gatherloop-pos/ui';
import { MenuList, MenuListProps } from '@gatherloop-pos/ui/order';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

// P6 in docs/trd-order-app-composition-and-ssr.md: resolves the session,
// the table and the menu, so `MenuList` renders the real screen (and a
// `?product=` deep link's sheet) on the first response instead of a
// skeleton (§3.4).
export const getServerSideProps: GetServerSideProps<MenuListProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  const code = String(ctx.params?.code ?? '');
  const url = getUrlFromCtx(ctx);
  const client = new QueryClient();

  const [table, menu] = await Promise.all([
    // `undefined` (an unexpected transport error) keeps today's
    // client-only retry path instead of failing the whole page; `null` (a
    // known-bad code) seeds `notFound` directly.
    new ApiPublicTableRepository()
      .resolveTableByCode(code)
      .catch((error) =>
        error instanceof TableNotFoundError ? null : undefined
      ),
    // A menu fetch failure falls back to an unseeded, empty menu rather
    // than failing the page — `MenuListUsecase` starts `idle` and the
    // client retries on mount, same as before P6.
    new ApiMenuRepository(client)
      .fetchMenu({ query: '' })
      .catch(() => ({ products: [], categories: [], variants: [] })),
  ]);

  return {
    props: {
      sessionId,
      code,
      table,
      products: menu.products,
      categories: menu.categories,
      variants: menu.variants,
      selectedProductId:
        new UrlMenuListQueryRepository().getSelectedProductId(url),
    },
  };
};

export default MenuList;
