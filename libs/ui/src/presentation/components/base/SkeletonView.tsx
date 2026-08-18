import { Card, XStack, YStack } from 'tamagui';

// Deliberately no `animation`/`enterStyle` here: Tamagui's web animation
// driver resolves an animated `View`'s style to an *array* of style objects
// (base + enter-variant) instead of one merged object, and forwards it
// straight through react-native-web's DOM view without flattening. React
// DOM's `setValueForStyles` then does `element.style[0] = ...`, which
// browsers have never supported (Chromium: "Indexed property setter is not
// supported") — most engines silently ignore the bad assignment, but it hard
// -crashes first paint here since this skeleton, unlike an alert or a sheet
// entrance transition elsewhere in the app, is often the very first
// component Tamagui's driver ever animates in a session. A static skeleton
// reads fine without the shimmer.
export const SkeletonCard = () => (
  <Card opacity={0.5}>
    <YStack gap="$2" padding="$3">
      <XStack
        height={16}
        backgroundColor="$gray5"
        borderRadius="$2"
        width="60%"
      />
      <XStack
        height={12}
        backgroundColor="$gray4"
        borderRadius="$2"
        width="40%"
      />
    </YStack>
  </Card>
);

export const SkeletonList = ({ count = 5 }: { count?: number }) => (
  <YStack gap="$3" testID="skeleton-list">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </YStack>
);
