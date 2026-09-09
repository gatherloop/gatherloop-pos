import ReactNativeMarkdown from 'react-native-markdown-display';
import { MarkdownProps } from './types';

export const Markdown = (props: MarkdownProps) => {
  return <ReactNativeMarkdown>{props.content}</ReactNativeMarkdown>;
};
