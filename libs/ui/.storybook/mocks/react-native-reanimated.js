/* eslint-disable @typescript-eslint/no-empty-function */

const noop = () => {};
const identity = (v) => v;
const useValue = (init) => ({ value: init });

export const useSharedValue = useValue;
export const useDerivedValue = (fn) => ({ value: fn() });
export const useAnimatedStyle = (fn) => fn();
export const useAnimatedReaction = noop;

export const withSpring = identity;
export const withTiming = identity;
export const cancelAnimation = noop;
export const runOnJS = (fn) => fn;

const Animated = new Proxy(
  {},
  {
    get(_target, prop) {
      return prop;
    },
  }
);
export default Animated;
