import '@tamagui/core/reset.css';
import './global.css';

import { NextThemeProvider, useRootTheme } from '@tamagui/next-theme';
import { AppProps } from 'next/app';
import Head from 'next/head';
import React, { useMemo } from 'react';
import { RootProvider } from '@gatherloop-pos/provider';
import { DehydratedState, HydrationBoundary } from '@tanstack/react-query';
import NextNProgress from 'nextjs-progressbar';

export type PageProps = {
  dehydratedState: DehydratedState;
};

if (process.env.NODE_ENV === 'production') {
  require('../../public/tamagui.css');
}

export default function App({ Component, pageProps }: AppProps<PageProps>) {
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
      <NextNProgress options={{ showSpinner: false }} />
      <NextThemeProvider onChangeTheme={setTheme as any}>
        <RootProvider
          tamaguiProviderProps={{
            disableInjectCSS: true,
            disableRootThemeClass: true,
            defaultTheme: theme,
          }}
        >
          <HydrationBoundary state={pageProps.dehydratedState}>
            {contents}
          </HydrationBoundary>
        </RootProvider>
      </NextThemeProvider>
    </>
  );
}
