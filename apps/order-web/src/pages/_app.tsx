import '@tamagui/core/reset.css';
import './global.css';

import { RootProvider } from '@gatherloop-pos/provider';
import { AppProps } from 'next/app';
import Head from 'next/head';
import NextNProgress from 'nextjs-progressbar';

if (process.env.NODE_ENV === 'production') {
  require('../../public/tamagui.css');
}

// CTA blue the buttons already use (@tamagui/config blue9); moves to
// libs/ui/src/utils/brand.ts as ORDER_BRAND_COLOR in Phase 3.
const ORDER_BRAND_COLOR = '#0090FF';

export default function App({ Component, pageProps }: AppProps) {
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
      <NextNProgress
        color={ORDER_BRAND_COLOR}
        height={3}
        options={{ showSpinner: false }}
      />
      <RootProvider
        tamaguiProviderProps={{ disableInjectCSS: true, defaultTheme: 'light' }}
      >
        <Component {...pageProps} />
      </RootProvider>
    </>
  );
}
