import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { TamaguiProvider, TamaguiProviderProps } from 'tamagui';
import { tamaguiConfig, ConfirmationAlertProvider } from '@gatherloop-pos/ui';
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
        <ToastProvider>
          <ConfirmationAlertProvider>
            {props.children}
          </ConfirmationAlertProvider>
          <CurrentToast />
          <ToastViewport
            flexDirection="column"
            bottom={10}
            left={0}
            right={0}
          />
        </ToastProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
};
