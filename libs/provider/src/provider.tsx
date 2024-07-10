import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { TamaguiProvider, TamaguiProviderProps, PortalProvider } from 'tamagui';
import { tamaguiConfig } from '@gatherloop-pos/ui';
import { ToastProvider, ToastViewport } from '@tamagui/toast';
import { CurrentToast } from './currentToast';

const queryClient = new QueryClient();

export type RootProviderProps = {
  children: ReactNode;
  tamaguiProviderProps?: TamaguiProviderProps;
};

export const RootProvider = (props: RootProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={tamaguiConfig} {...props.tamaguiProviderProps}>
        <PortalProvider shouldAddRootHost>
          <ToastProvider>
            {props.children}
            <CurrentToast />
            <ToastViewport
              flexDirection="column"
              bottom={10}
              left={0}
              right={0}
            />
          </ToastProvider>
        </PortalProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
};
