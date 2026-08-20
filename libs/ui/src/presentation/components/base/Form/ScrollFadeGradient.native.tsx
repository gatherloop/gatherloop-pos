import { YStack } from 'tamagui';

export type ScrollFadeGradientProps = {
  start?: [number, number];
  end?: [number, number];
  fullscreen?: boolean;
  colors: [string, string];
  borderRadius?: string | number;
};

// react-native-linear-gradient/expo-linear-gradient are avoided here since
// they'd require Expo modules to be wired into the native Android/iOS
// projects. This is only a decorative scroll-fade overlay, so a flat
// translucent fill is used instead of a true gradient on native.
export const ScrollFadeGradient = ({
  fullscreen,
  colors,
  borderRadius,
}: ScrollFadeGradientProps) => {
  const backgroundColor = colors.find((color) => color !== 'transparent');

  return (
    <YStack
      {...(fullscreen && {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      })}
      backgroundColor={backgroundColor}
      opacity={0.6}
      borderRadius={borderRadius}
    />
  );
};
