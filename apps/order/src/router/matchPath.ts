// Minimal `:param` path matcher for the History-API router (D19). No
// external router package is pulled in — the customer app has a handful of
// routes (menu, item detail, cart, checkout) and `useNavigation()` (in
// libs/ui) already keeps every handler decoupled from however matching is
// implemented here.
export type PathParams = Record<string, string>;

export const matchPath = (
  pattern: string,
  pathname: string
): PathParams | null => {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: PathParams = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
    } else if (patternSegment !== pathSegment) {
      return null;
    }
  }

  return params;
};
