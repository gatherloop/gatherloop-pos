import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';

export let navigationRef: NavigationContainerRef<ParamListBase> | null = null;

export function setNavigationRef(ref: NavigationContainerRef<ParamListBase>) {
  navigationRef = ref;
}

export function setQueryParam(key: string, value: string) {
  if (!navigationRef) {
    console.warn('navigationRef not set');
    return;
  }

  const currentRoute = navigationRef.getCurrentRoute();
  if (!currentRoute) return;

  navigationRef.navigate(currentRoute.name as string, {
    ...(currentRoute.params ?? {}),
    [key]: value,
  });
}

export function getQueryParam(key: string, url?: string): string | undefined {
  if (navigationRef) {
    const currentRoute = navigationRef.getCurrentRoute();
    const params = currentRoute?.params as Record<string, unknown> | undefined;
    const value = params?.[key];

    return typeof value === 'string' ? value : undefined;
  }

  return undefined;
}
