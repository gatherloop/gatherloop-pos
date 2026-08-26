import '@tamagui/core/reset.css';
import './global.css';

import { RootProvider } from '@gatherloop-pos/provider';
import { CartProvider, SessionProvider } from '@gatherloop-pos/ui/order';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { NextPage } from 'next';
import { ReactElement, ReactNode, useEffect, useState } from 'react';

if (process.env.NODE_ENV === 'production') {
  require('../../public/tamagui.css');
}

// D4 in docs/trd-order-app-nextjs-migration.md: pages opt into a shared
// `getLayout` so React reconciles the layout by type across a navigation
// instead of remounting it — that's what keeps TableResolve/MenuList/Cart
// mounted (scroll position, search text, the table resolved once per
// visit) the same way the old SPA's router did for free.
type OrderPage = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type OrderAppProps = AppProps & {
  Component: OrderPage;
};

export default function App({ Component, pageProps }: OrderAppProps) {
  // D5.1: SessionProvider constructs BrowserSessionRepository during
  // render, which touches document.cookie/crypto — fatal during a
  // server/prerender pass. Gate the whole provider tree on mount so the
  // server emits an empty shell, same first-paint story as today's SPA.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Intentional: this only ever flips false -> true once, to detect that
    // client hydration has happened — not to synchronize with an external
    // system's ongoing changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
        {mounted ? (
          <SessionProvider>
            <CartProvider>{getLayout(<Component {...pageProps} />)}</CartProvider>
          </SessionProvider>
        ) : null}
      </RootProvider>
    </>
  );
}
