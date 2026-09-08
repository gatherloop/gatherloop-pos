import {
  resolveSession,
  SESSION_ID_COOKIE_NAME,
} from '@gatherloop-pos/ui';
import { GetServerSideProps, NextPage } from 'next';
import { ReactElement, ReactNode } from 'react';
import { MenuLayout } from '../../../components/MenuLayout';

export type MenuListPageProps = { sessionId: string };

// D3 in docs/trd-order-app-composition-and-ssr.md: resolves the session and
// nothing else — no seeding yet (P6).
export const getServerSideProps: GetServerSideProps<
  MenuListPageProps
> = async (ctx) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  return { props: { sessionId } };
};

// The menu route (FR-5/FR-7 in docs/prd-table-ordering.md). The page itself
// renders nothing — `MenuList` is rendered by `MenuLayout.getLayout` (D4) so
// it stays mounted across navigation to/from the item detail sheet.
const MenuListPage: NextPage<MenuListPageProps> & {
  getLayout?: (page: ReactElement, pageProps: MenuListPageProps) => ReactNode;
} = () => null;

MenuListPage.getLayout = (page, pageProps) => (
  <MenuLayout sessionId={pageProps.sessionId}>{page}</MenuLayout>
);

export default MenuListPage;
