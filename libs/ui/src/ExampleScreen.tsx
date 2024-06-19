import React from 'react';
import { Button, Heading, Paragraph, YStack } from 'tamagui';

export const ExampleScreen = () => {
  return (
    <YStack>
      <Heading>Example Screen</Heading>
      <Paragraph>Watch it change!</Paragraph>
      <Button>Click Me</Button>
    </YStack>
  );
};
