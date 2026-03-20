// Stub for solito/link in the Storybook web environment.
// Renders a plain <a> tag instead of the native-compatible Solito Link.
import React from 'react';

export const Link = ({ href, children, viewProps, textProps, ...rest }) =>
  React.createElement('a', { href: href ?? '#', ...rest }, children);

export const TextLink = ({ href, children, style, ...rest }) =>
  React.createElement('a', { href: href ?? '#', style, ...rest }, children);
