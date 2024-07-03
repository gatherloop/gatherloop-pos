import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { TamaguiProvider, TamaguiProviderProps } from 'tamagui';
import { tamaguiConfig } from '@gatherloop-pos/ui';

const queryClient = new QueryClient();

export type RootProviderProps = {
  children: ReactNode;
  tamaguiProviderProps?: TamaguiProviderProps;
};

export const RootProvider = (props: RootProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={tamaguiConfig} {...props.tamaguiProviderProps}>
        {props.children}
      </TamaguiProvider>
    </QueryClientProvider>
  );
};
