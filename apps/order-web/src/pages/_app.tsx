import '@tamagui/core/reset.css';
import './global.css';

import { RootProvider } from '@gatherloop-pos/provider';
import { AppProps } from 'next/app';
import Head from 'next/head';

if (process.env.NODE_ENV === 'production') {
  require('../../public/tamagui.css');
}

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
      <RootProvider
        tamaguiProviderProps={{ disableInjectCSS: true, defaultTheme: 'light' }}
      >
        <Component {...pageProps} />
      </RootProvider>
    </>
  );
}
