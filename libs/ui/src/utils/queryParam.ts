import { Platform } from 'react-native';
import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import Router from 'next/router';

export let navigationRef: NavigationContainerRef<ParamListBase> | null = null;

export function setNavigationRef(ref: NavigationContainerRef<ParamListBase>) {
  navigationRef = ref;
}

export type SetQueryParamOptions = {
  history?: 'push' | 'replace';
};

export function setQueryParam(
  key: string,
  value: string | null,
  options?: SetQueryParamOptions
) {
  if (Platform.OS === 'web') {
    const url = new URL(window.location.href);
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }

    if (options?.history === 'push') {
      Router.push(url.toString(), undefined, { shallow: true });
    } else {
      window.history.replaceState({}, '', url.toString());
      Router.replace(url.toString(), undefined, { shallow: true });
    }
  } else {
    if (!navigationRef) {
      console.warn('navigationRef not set');
      return;
    }

    const currentRoute = navigationRef.getCurrentRoute();
    if (!currentRoute) return;

    navigationRef.navigate(currentRoute.name as string, {
      ...(currentRoute.params ?? {}),
      [key]: value === null ? undefined : value,
    });
  }
}

export function getQueryParam(key: string, url?: string): string | undefined {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' && url) {
      return new URL(url ?? '').searchParams.get(key) || undefined;
    } else if (typeof window !== 'undefined') {
      return new URL(window.location.href).searchParams.get(key) || undefined;
    }
  } else {
    if (navigationRef) {
      const currentRoute = navigationRef.getCurrentRoute();
      const params = currentRoute?.params as
        | Record<string, unknown>
        | undefined;
      const value = params?.[key];

      return typeof value === 'string' ? value : undefined;
    }

    return undefined;
  }
}
