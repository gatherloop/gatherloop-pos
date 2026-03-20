import { ReactNode } from 'react';
import { Separator, SizableText, Tabs as TamaguiTabs } from 'tamagui';

export type TabsProps = {
  tabs: {
    value: string;
    label: string;
    content: ReactNode;
    isShown?: boolean;
  }[];
  defaultValue: string;
};

export const Tabs = ({ tabs, defaultValue }: TabsProps) => {
  const shownTabs = tabs.filter(
    ({ isShown }) => typeof isShown === 'undefined' || isShown
  );
  return (
    <TamaguiTabs
      defaultValue={defaultValue}
      orientation="horizontal"
      flexDirection="column"
      flex={1}
    >
      <TamaguiTabs.List gap="$1" flexWrap="wrap">
        {shownTabs.map(({ value, label }) => (
          <TamaguiTabs.Tab key={value} value={value} radiused>
            <SizableText fontFamily="$body">{label}</SizableText>
          </TamaguiTabs.Tab>
        ))}
      </TamaguiTabs.List>
      <Separator />
      {shownTabs.map(({ value, content }) => (
        <TamaguiTabs.Content
          key={value}
          value={value}
          flex={1}
        >
          {content}
        </TamaguiTabs.Content>
      ))}
    </TamaguiTabs>
  );
};
