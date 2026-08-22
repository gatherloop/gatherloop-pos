import {
  createNavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<ParamListBase>();

export function setQueryParam(key: string, value: string) {
  if (navigationRef.isReady()) {
    const currentRoute = navigationRef.getCurrentRoute();
    if (!currentRoute) return;
    navigationRef.navigate(currentRoute.name, {
      ...(currentRoute.params ?? {}),
      [key]: value,
    });
  }
}

export function getQueryParam(key: string, url?: string): string | undefined {
  if (navigationRef.isReady()) {
    const currentRoute = navigationRef.getCurrentRoute();
    const params = currentRoute?.params as Record<string, unknown> | undefined;
    const value = params?.[key];

    return typeof value === 'string' ? value : undefined;
  }

  return undefined;
}
