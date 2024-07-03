import '@tamagui/core/reset.css';
import './global.css';

import { NextThemeProvider, useRootTheme } from '@tamagui/next-theme';
import { AppProps } from 'next/app';
import Head from 'next/head';
import React, { useMemo } from 'react';
import { RootProvider } from '@gatherloop-pos/provider';

export default function App({ Component, pageProps }: AppProps) {
  const [theme, setTheme] = useRootTheme();

  const contents = useMemo(() => {
    return <Component {...pageProps} />;
  }, [pageProps]);

  return (
    <>
      <Head>
        <title>Gatherloop POS</title>
        <meta name="description" content="Your page description" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <NextThemeProvider onChangeTheme={setTheme as any}>
        <RootProvider
          tamaguiProviderProps={{
            disableInjectCSS: true,
            disableRootThemeClass: true,
            defaultTheme: theme,
          }}
        >
          {contents}
        </RootProvider>
      </NextThemeProvider>
    </>
  );
}
