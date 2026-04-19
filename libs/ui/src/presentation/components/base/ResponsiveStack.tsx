import { XStack } from 'tamagui';
import type { XStackProps } from 'tamagui';

export type ResponsiveStackProps = XStackProps;

export const ResponsiveStack = (props: ResponsiveStackProps) => (
  <XStack flexDirection="row" $md={{ flexDirection: 'column' }} {...props} />
);
