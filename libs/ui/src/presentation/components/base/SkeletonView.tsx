import { Card, XStack, YStack } from 'tamagui';

export const SkeletonCard = () => (
  <Card animation="slow" opacity={0.5} enterStyle={{ opacity: 0.3 }}>
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
