import '@tamagui/core/reset.css';
import './global.css';

import { NextThemeProvider, useRootTheme } from '@tamagui/next-theme';
import { AppProps } from 'next/app';
import Head from 'next/head';
import React, { useMemo } from 'react';
import { RootProvider } from '@gatherloop-pos/provider';
import { DehydratedState, HydrationBoundary } from '@tanstack/react-query';

export type PageProps = {
  dehydratedState: DehydratedState;
};

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
