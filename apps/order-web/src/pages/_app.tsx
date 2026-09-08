import '@tamagui/core/reset.css';
import './global.css';

import { RootProvider } from '@gatherloop-pos/provider';
import { CartProvider } from '@gatherloop-pos/ui/order';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { NextPage } from 'next';
import { ReactElement, ReactNode } from 'react';

if (process.env.NODE_ENV === 'production') {
  require('../../public/tamagui.css');
}

// Every order page resolves its session id server-side (D3 in
// docs/trd-order-app-composition-and-ssr.md) except the static 404, which
// Next never runs getServerSideProps for — CookieSessionRepository falls
// back to minting one client-side for that one route (D4).
type OrderPageProps = { sessionId?: string };

// D4 in docs/trd-order-app-nextjs-migration.md: pages opt into a shared
// `getLayout` so React reconciles the layout by type across a navigation
// instead of remounting it — that's what keeps TableResolve/MenuList/Cart
// mounted (scroll position, search text, the table resolved once per
// visit) the same way the old SPA's router did for free. `pageProps` is
// threaded through so a layout can forward `sessionId` to `TableResolve`
// without a context of its own (D3).
type OrderPage = NextPage<OrderPageProps> & {
  getLayout?: (page: ReactElement, pageProps: OrderPageProps) => ReactNode;
};

type OrderAppProps = AppProps<OrderPageProps> & {
  Component: OrderPage;
};

export default function App({ Component, pageProps }: OrderAppProps) {
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);

  return (
    <>
      <Head>
        <title>Gatherloop Order</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <RootProvider
        tamaguiProviderProps={{ disableInjectCSS: true, defaultTheme: 'light' }}
      >
        <CartProvider sessionId={pageProps.sessionId}>
          {getLayout(<Component {...pageProps} />, pageProps)}
        </CartProvider>
      </RootProvider>
    </>
  );
}
