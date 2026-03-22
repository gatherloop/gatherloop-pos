/* eslint-disable @typescript-eslint/no-empty-function */
// Stub for react-native-reanimated in the Storybook web environment.
// Tamagui's moti-based animation driver imports reanimated directly, but on
// web it falls back to CSS transitions so the actual native module is never
// exercised.  Providing no-op stubs keeps the import chain from crashing.

const noop = () => {};
const identity = (v) => v;
const useValue = (init) => ({ value: init });

// Hook stubs
export const useSharedValue = useValue;
export const useDerivedValue = (fn) => ({ value: fn() });
export const useAnimatedStyle = (fn) => fn();
export const useAnimatedReaction = noop;

// API stubs
export const withSpring = identity;
export const withTiming = identity;
export const cancelAnimation = noop;
export const runOnJS = (fn) => fn;

// Animated component wrapper – just returns the underlying component
const Animated = new Proxy(
  {},
  {
    get(_target, prop) {
      // Animated.View, Animated.Text, etc. – return a passthrough
      return prop;
    },
  }
);
export default Animated;
