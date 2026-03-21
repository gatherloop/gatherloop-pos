import ReactMarkdown from 'react-markdown';
import {
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Paragraph,
  Separator,
  SizableText,
  YStack,
} from 'tamagui';
import { MarkdownProps } from './types';

export const Markdown = (props: MarkdownProps) => {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <H1 marginVertical="$2">{children}</H1>,
        h2: ({ children }) => <H2 marginVertical="$2">{children}</H2>,
        h3: ({ children }) => <H3 marginVertical="$2">{children}</H3>,
        h4: ({ children }) => <H4 marginVertical="$2">{children}</H4>,
        h5: ({ children }) => <H5 marginVertical="$2">{children}</H5>,
        h6: ({ children }) => <H6 marginVertical="$2">{children}</H6>,
        p: ({ children }) => <Paragraph marginVertical="$1">{children}</Paragraph>,
        strong: ({ children }) => (
          <SizableText fontWeight="bold">{children}</SizableText>
        ),
        em: ({ children }) => (
          <SizableText fontStyle="italic">{children}</SizableText>
        ),
        a: ({ href, children }) => (
          <SizableText
            color="$blue10"
            textDecorationLine="underline"
            cursor="pointer"
            tag="a"
            // @ts-ignore
            href={href}
          >
            {children}
          </SizableText>
        ),
        code: ({ children, className }) => {
          const isBlock = Boolean(className?.startsWith('language-'));
          if (isBlock) {
            return (
              <YStack
                backgroundColor="$gray3"
                padding="$3"
                borderRadius="$3"
                marginVertical="$2"
              >
                <SizableText fontFamily="$mono" size="$3">
                  {children}
                </SizableText>
              </YStack>
            );
          }
          return (
            <SizableText
              fontFamily="$mono"
              size="$3"
              backgroundColor="$gray3"
              paddingHorizontal="$1"
              borderRadius="$1"
            >
              {children}
            </SizableText>
          );
        },
        blockquote: ({ children }) => (
          <YStack
            borderLeftWidth={4}
            borderLeftColor="$gray6"
            paddingLeft="$3"
            marginVertical="$2"
          >
            {children}
          </YStack>
        ),
        hr: () => <Separator marginVertical="$3" />,
        ol: ({ children }) => (
          <ol style={{ listStyleType: 'decimal', paddingLeft: 20, margin: 0 }}>
            {children}
          </ol>
        ),
        ul: ({ children }) => (
          <ul style={{ listStyleType: 'disc', paddingLeft: 20, margin: 0 }}>
            {children}
          </ul>
        ),
        li: ({ children }) => (
          <li style={{ display: 'list-item', marginBottom: 4 }}>
            <Paragraph>{children}</Paragraph>
          </li>
        ),
      }}
    >
      {props.content}
    </ReactMarkdown>
  );
};
