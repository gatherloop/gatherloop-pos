import React from 'react';

export const Link: React.FC<{ href: string; children?: React.ReactNode }> = ({ children }) =>
  React.createElement(React.Fragment, null, children);
