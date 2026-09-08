import { resolveSession, SESSION_ID_COOKIE_NAME } from '@gatherloop-pos/ui';
import { MenuList, MenuListProps } from '@gatherloop-pos/ui/order';
import { GetServerSideProps } from 'next';

// D3/D9 in docs/trd-order-app-composition-and-ssr.md: resolves the session
// and nothing else — no seeding yet (P6). `MenuList` now owns the whole
// vertical slice (table shell, menu, item sheet), so this page is already
// the target shape (§3.1): a getServerSideProps and a default export.
export const getServerSideProps: GetServerSideProps<MenuListProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  return {
    props: { sessionId, code: String(ctx.params?.code ?? '') },
  };
};

export default MenuList;
