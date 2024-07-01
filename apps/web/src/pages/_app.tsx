import '@tamagui/core/reset.css';

import { NextThemeProvider, useRootTheme } from '@tamagui/next-theme';
import { AppProps } from 'next/app';
import Head from 'next/head';
import React, { useMemo } from 'react';
import { TamaguiProvider } from 'tamagui';

import tamaguiConfig from '../../tamagui.config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

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
        <QueryClientProvider client={queryClient}>
          <TamaguiProvider
            config={tamaguiConfig}
            disableInjectCSS
            disableRootThemeClass
            defaultTheme={theme}
          >
            {contents}
          </TamaguiProvider>
        </QueryClientProvider>
      </NextThemeProvider>
    </>
  );
}
