import ReactMarkdown from 'react-markdown';
import { MarkdownProps } from './types';

export const Markdown = (props: MarkdownProps) => {
  return (
    <ReactMarkdown
      components={{
        ol: (props) => (
          <ol {...props} style={{ listStyleType: 'decimal', paddingLeft: 20 }}>
            {props.children}
          </ol>
        ),
        ul: (props) => (
          <ul {...props} style={{ listStyleType: 'disc', paddingLeft: 20 }}>
            {props.children}
          </ul>
        ),
        li: (props) => (
          <li
            {...props}
            style={{
              display: 'list-item',
              marginBottom: 5,
            }}
          >
            {props.children}
          </li>
        ),
      }}
    >
      {props.content}
    </ReactMarkdown>
  );
};
