/* eslint-disable @typescript-eslint/no-var-requires */
const React = require('react');

type AnyProps = {
  children?: unknown;
  [key: string]: unknown;
};

const makeComponent = (name: string) => {
  const Component = ({ children, onPress }: AnyProps) =>
    React.createElement(
      'div',
      { 'data-component': name, ...(onPress ? { onClick: onPress } : {}) },
      children
    );
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

export const Input = ({ value, placeholder, onChangeText, id }: AnyProps) =>
  React.createElement('input', {
    id,
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
const PopoverContent = ({ children }: AnyProps) =>
  React.createElement(React.Fragment, null, children);
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
export const ListItem = ({ children, title, onPress }: AnyProps) =>
  React.createElement(
    'div',
    { 'data-component': 'TamaguiListItem', ...(onPress ? { onClick: onPress } : {}) },
    title,
    children
  );

// AlertDialog — supports onOpenChange context so Cancel children can close the dialog
const AlertDialogContext = React.createContext<{ onOpenChange?: () => void }>({});

const AlertDialogBase = ({ open, children, onOpenChange }: AnyProps) =>
  open
    ? React.createElement(
        AlertDialogContext.Provider,
        { value: { onOpenChange } },
        React.createElement('div', { 'data-component': 'AlertDialog' }, children)
      )
    : null;
const AlertDialogPortal = ({ children }: AnyProps) =>
  React.createElement(React.Fragment, null, children);
const AlertDialogOverlay = () => null;
const AlertDialogContent = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'AlertDialog.Content' }, children);
const AlertDialogTitle = ({ children }: AnyProps) =>
  React.createElement('h3', null, children);
const AlertDialogDescription = ({ children }: AnyProps) =>
  React.createElement('p', null, children);
// Cancel: wraps children in a span that calls onOpenChange when clicked (simulates asChild close)
const AlertDialogCancel = ({ children }: AnyProps) => {
  const { onOpenChange } = React.useContext(AlertDialogContext);
  return React.createElement('span', { onClick: () => onOpenChange?.() }, children);
};
const AlertDialogAction = ({ children }: AnyProps) =>
  React.createElement(React.Fragment, null, children);
export const AlertDialog = Object.assign(AlertDialogBase, {
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Cancel: AlertDialogCancel,
  Action: AlertDialogAction,
});

// Form
const FormBase = ({ children, onSubmit }: AnyProps) =>
  React.createElement('form', { onSubmit }, children);
const FormTrigger = ({ children }: AnyProps) =>
  React.createElement(React.Fragment, null, children);
export const Form = Object.assign(FormBase, { Trigger: FormTrigger });

// Card
const CardBase = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Card' }, children);
const CardHeader = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Card.Header' }, children);
const CardFooter = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Card.Footer' }, children);
export const Card = Object.assign(CardBase, { Header: CardHeader, Footer: CardFooter });

// Sheet
const SheetBase = ({ open, children }: AnyProps) =>
  open ? React.createElement('div', { 'data-component': 'Sheet' }, children) : null;
const SheetFrame = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Sheet.Frame' }, children);
const SheetHandle = () => null;
const SheetOverlay = () => null;
const SheetScrollView = ({ children }: AnyProps) =>
  React.createElement('div', null, children);
export const Sheet = Object.assign(SheetBase, {
  Frame: SheetFrame,
  Handle: SheetHandle,
  Overlay: SheetOverlay,
  ScrollView: SheetScrollView,
});

// Select
const SelectBase = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Select' }, children);
const SelectTrigger = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Select.Trigger' }, children);
const SelectValue = ({ children }: AnyProps) =>
  React.createElement('span', null, children);
const SelectContent = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Select.Content' }, children);
const SelectViewport = ({ children }: AnyProps) =>
  React.createElement('div', null, children);
const SelectItem = ({ children }: AnyProps) =>
  React.createElement('div', null, children);
const SelectItemText = ({ children }: AnyProps) =>
  React.createElement('span', null, children);
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;
export const Select = Object.assign(SelectBase, {
  Trigger: SelectTrigger,
  Value: SelectValue,
  Content: SelectContent,
  Viewport: SelectViewport,
  Item: SelectItem,
  ItemText: SelectItemText,
  ScrollUpButton: SelectScrollUpButton,
  ScrollDownButton: SelectScrollDownButton,
});

// Tabs
const TabsBase = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Tabs' }, children);
const TabsList = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Tabs.List' }, children);
const TabsTrigger = ({ children }: AnyProps) =>
  React.createElement('button', null, children);
const TabsContent = ({ children }: AnyProps) =>
  React.createElement('div', null, children);
export const Tabs = Object.assign(TabsBase, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});

// Theme, PortalProvider, SizableText, TextArea, Square
export const Theme = ({ children }: AnyProps) =>
  React.createElement(React.Fragment, null, children);
export const PortalProvider = ({ children }: AnyProps) =>
  React.createElement(React.Fragment, null, children);
export const SizableText = ({ children }: AnyProps) =>
  React.createElement('span', null, children);
export const TextArea = ({ value, placeholder, onChangeText }: AnyProps) =>
  React.createElement('textarea', {
    value,
    placeholder,
    onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
  });
export const Square = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Square' }, children);

// Accordion
const AccordionBase = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Accordion' }, children);
const AccordionItem = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Accordion.Item' }, children);
const AccordionTrigger = ({ children, onPress }: AnyProps) =>
  React.createElement('button', { onClick: onPress }, children);
const AccordionContent = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Accordion.Content' }, children);
const AccordionHeading = ({ children }: AnyProps) =>
  React.createElement('div', null, children);
const AccordionHeightAnimator = ({ children }: AnyProps) =>
  React.createElement('div', { 'data-component': 'Accordion.HeightAnimator' }, children);
export const Accordion = Object.assign(AccordionBase, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
  Heading: AccordionHeading,
  HeightAnimator: AccordionHeightAnimator,
});

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
export type InputProps = AnyProps;
export type TextAreaProps = AnyProps;
