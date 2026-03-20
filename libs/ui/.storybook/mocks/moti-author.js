// Stub for moti/author in the Storybook web environment.
// @tamagui/animations-moti imports useMotify from this module. On web,
// tamagui uses CSS transitions so the moti animation driver is never
// actually exercised.

export const useMotify = () => ({
  style: {},
  props: {},
  state: { current: 'idle' },
});
