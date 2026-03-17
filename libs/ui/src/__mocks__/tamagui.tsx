/* eslint-disable @typescript-eslint/no-var-requires */
const React = require('react');

type AnyProps = {
  children?: unknown;
  [key: string]: unknown;
};

const makeComponent = (name: string) => {
  const Component = ({ children }: AnyProps) =>
    React.createElement('div', { 'data-component': name }, children);
  Component.displayName = name;
  return Component;
};

export const YStack = makeComponent('YStack');
export const XStack = makeComponent('XStack');
export const ZStack = makeComponent('ZStack');
export const Stack = makeComponent('Stack');
export const View = makeComponent('View');
export const ScrollView = makeComponent('ScrollView');
export const Image = makeComponent('Image');

export const Paragraph = ({ children }: AnyProps) =>
  React.createElement('p', null, children);
export const H1 = ({ children }: AnyProps) => React.createElement('h1', null, children);
export const H2 = ({ children }: AnyProps) => React.createElement('h2', null, children);
export const H3 = ({ children }: AnyProps) => React.createElement('h3', null, children);
export const H4 = ({ children }: AnyProps) => React.createElement('h4', null, children);
export const H5 = ({ children }: AnyProps) => React.createElement('h5', null, children);
export const H6 = ({ children }: AnyProps) => React.createElement('h6', null, children);
export const Text = ({ children }: AnyProps) => React.createElement('span', null, children);

export const Button = ({ children, onPress }: AnyProps) =>
  React.createElement('button', { onClick: onPress }, children);

export const Input = ({ value, placeholder, onChangeText }: AnyProps) =>
  React.createElement('input', {
    value,
    placeholder,
    onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
  });

export const Label = ({ children }: AnyProps) =>
  React.createElement('label', null, children);

export const Separator = () => React.createElement('hr', null);

export const Spinner = () =>
  React.createElement('div', { 'data-testid': 'spinner' });

// Popover
const PopoverBase = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Popover' }, children);
const PopoverTrigger = ({ children }: AnyProps) =>
  React.createElement(React.Fragment, null, children);
const PopoverContent = () => null;
const PopoverArrow = () => null;
export const Popover = Object.assign(PopoverBase, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Arrow: PopoverArrow,
});

// RadioGroup
const RadioGroupBase = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'RadioGroup' }, children);
const RadioGroupItem = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'RadioGroup.Item' }, children);
const RadioGroupIndicator = () => null;
export const RadioGroup = Object.assign(RadioGroupBase, {
  Item: RadioGroupItem,
  Indicator: RadioGroupIndicator,
});

// YGroup
const YGroupBase = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'YGroup' }, children);
const YGroupItem = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'YGroup.Item' }, children);
export const YGroup = Object.assign(YGroupBase, {
  Item: YGroupItem,
});

// Tamagui's built-in ListItem (distinct from our base/ListItem.tsx)
export const ListItem = ({ children, title }: AnyProps) =>
  React.createElement('div', { 'data-component': 'TamaguiListItem' }, title, children);

// Hooks
export const usePopoverContext = () => ({ onOpenChange: jest.fn() });
export const useTheme = () => ({});
export const useMedia = () => ({});

// Utilities
export const createTamagui = (config: unknown) => config;
export const styled = (Component: unknown) => Component;
export const getConfig = () => ({});
export const config = {};

// Type exports
export type XStackProps = AnyProps;
export type YStackProps = AnyProps;
export type StackProps = AnyProps;
export type TextProps = AnyProps;
export type ButtonProps = AnyProps;
