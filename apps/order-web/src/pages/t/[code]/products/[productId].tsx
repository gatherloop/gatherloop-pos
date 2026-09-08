import {
  resolveSession,
  SESSION_ID_COOKIE_NAME,
} from '@gatherloop-pos/ui';
import { MenuItemDetail } from '@gatherloop-pos/ui/order';
import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { ReactElement, ReactNode } from 'react';
import { MenuLayout } from '../../../../components/MenuLayout';

export type MenuItemDetailPageProps = { sessionId: string };

// D3 in docs/trd-order-app-composition-and-ssr.md: resolves the session and
// nothing else — no seeding yet (P6).
export const getServerSideProps: GetServerSideProps<
  MenuItemDetailPageProps
> = async (ctx) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  return { props: { sessionId } };
};

// The item detail sheet (FR-6 in docs/prd-table-ordering.md), rendered
// alongside `MenuList` (mounted by `MenuLayout.getLayout`, D4) rather than
// instead of it, so the sheet sits on top of the menu.
const MenuItemDetailPage: NextPage<MenuItemDetailPageProps> & {
  getLayout?: (
    page: ReactElement,
    pageProps: MenuItemDetailPageProps
  ) => ReactNode;
} = () => {
  const router = useRouter();
  const productId =
    typeof router.query.productId === 'string'
      ? Number(router.query.productId)
      : NaN;

  return <MenuItemDetail productId={productId} />;
};

MenuItemDetailPage.getLayout = (page, pageProps) => (
  <MenuLayout sessionId={pageProps.sessionId}>{page}</MenuLayout>
);

export default MenuItemDetailPage;
