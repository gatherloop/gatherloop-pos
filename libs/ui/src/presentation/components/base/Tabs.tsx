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
      borderRadius="$4"
      overflow="hidden"
      borderColor="$borderColor"
      flex={1}
    >
      <TamaguiTabs.List padded gap="$3" flexWrap="wrap">
        {shownTabs.map(({ value, label }) => (
          <TamaguiTabs.Tab key={value} value={value} radiused>
            <SizableText fontFamily="$body">{label}</SizableText>
          </TamaguiTabs.Tab>
        ))}
      </TamaguiTabs.List>
      <Separator />
      {shownTabs.map(({ value, content }) => (
        <TamaguiTabs.Content
          backgroundColor="$background"
          key={value}
          value={value}
          padding="$2"
          flex={1}
          borderColor="$background"
          borderRadius="$2"
          borderTopLeftRadius={0}
          borderTopRightRadius={0}
          borderWidth="$2"
        >
          {content}
        </TamaguiTabs.Content>
      ))}
    </TamaguiTabs>
  );
};
