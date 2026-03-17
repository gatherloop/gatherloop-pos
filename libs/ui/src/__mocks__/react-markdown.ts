import React from 'react';

const ReactMarkdown: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
  React.createElement('div', { 'data-testid': 'markdown' }, children);

export default ReactMarkdown;
