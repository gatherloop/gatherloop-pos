/* eslint-disable @typescript-eslint/no-var-requires */
const React = require('react');

export const Platform = {
  OS: 'web',
  select: jest.fn((obj: Record<string, unknown>) => obj.web ?? obj.default),
};

export const FlatList = ({
  data,
  renderItem,
  keyExtractor,
}: {
  data?: unknown[];
  renderItem?: (info: { item: unknown; index: number }) => unknown;
  keyExtractor?: (item: unknown, index: number) => string;
  [key: string]: unknown;
}) =>
  React.createElement(
    'div',
    { 'data-testid': 'flat-list' },
    data?.map((item: unknown, index: number) => {
      const key = keyExtractor ? keyExtractor(item, index) : String(index);
      return React.createElement('div', { key }, renderItem?.({ item, index }));
    })
  );

export const TextInput = ({ ...props }: Record<string, unknown>) =>
  React.createElement('input', props);

export const useWindowDimensions = jest.fn(() => ({
  width: 1024,
  height: 768,
  scale: 1,
  fontScale: 1,
}));
