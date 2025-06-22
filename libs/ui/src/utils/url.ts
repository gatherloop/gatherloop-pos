import { GetServerSidePropsContext } from 'next';

export const getUrlFromCtx = (ctx: GetServerSidePropsContext) => {
  const protocol = ctx.req.headers['x-forwarded-proto'] || 'http';
  const host = ctx.req.headers.host;
  const fullUrl = `${protocol}://${host}${ctx.resolvedUrl}`;
  return fullUrl;
};
